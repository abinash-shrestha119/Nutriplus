import fetch from "node-fetch";
import asyncHandler from "../middleware/asyncHandler.js";
import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";
import { calcPrices } from "../utils/calcPrices.js";
import { buildKhaltiPaymentPayload, buildKhaltiUrls } from "../utils/Khalti.js";



const initiateKhalti = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  const isOrderOwner = order.user.toString() === req.user._id.toString();

  if (req.user.isAdmin || !isOrderOwner) {
    res.status(403);
    throw new Error("You can only pay for your own orders.");
  }

  const payload = buildKhaltiPaymentPayload(order, req);

  // 1️⃣ Initiate payment
  const initiateRes = await fetch(
    "https://a.khalti.com/api/v2/epayment/initiate/",
    {
      method: "POST",
      headers: {
        Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const responseText = await initiateRes.text();
  let data = {};

  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    res.status(502);
    throw new Error("Invalid response from Khalti payment gateway");
  }

  if (!initiateRes.ok) {
    res.status(400);
    throw new Error(data.detail || data.message || "Khalti initiate failed");
  }

  // 2️⃣ Redirect user to Khalti
  res.json({
    payment_url: data.payment_url,
  });
});

const khaltiCallback = asyncHandler(async (req, res) => {
  const { pidx, purchase_order_id, status } = req.query;
  const { frontendUrl } = buildKhaltiUrls(req);

  if (status !== "Completed") {
    return res.redirect(
      `${frontendUrl}/order/${purchase_order_id}?payment=failed`
    );
  }

  // verify payment with Khalti
  const response = await fetch(
    "https://a.khalti.com/api/v2/epayment/lookup/",
    {
      method: "POST",
      headers: {
        Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pidx }),
    }
  );

  const data = await response.json();

  if (data.status !== "Completed") {
    throw new Error("Payment verification failed");
  }

  const order = await Order.findById(purchase_order_id);

  if (!order) {
    throw new Error("Order not found");
  }

  order.isPaid = true;
  order.paidAt = Date.now();
  order.paymentResult = {
    id: data.transaction_id,
    status: data.status,
  };

  await order.save();

  // redirect back to frontend
  res.redirect(`${frontendUrl}/order/${order._id}`);
});



// @desc Create new order
// @route POST /api/orders
// @access Private
const addOrderItems = asyncHandler(async (req, res) => {
  const { orderItems, shippingAddress, paymentMethod } = req.body;

  if (req.user.isAdmin) {
    res.status(403);
    throw new Error("Admins cannot place orders.");
  }

  if (orderItems && orderItems.length === 0) {
    res.status(400);
    throw new Error("No order items");
  } else {
    // get the ordered items from our database
    const itemsFromDB = await Product.find({
      _id: { $in: orderItems.map((x) => x._id) },
    });

    // map over the order items and use the price from our items from database
    const dbOrderItems = orderItems.map((itemFromClient) => {
      const matchingItemFromDB = itemsFromDB.find(
        (itemFromDB) => itemFromDB._id.toString() === itemFromClient._id
      );
      return {
        ...itemFromClient,
        product: itemFromClient._id,
        price: matchingItemFromDB.price,
        _id: undefined,
      };
    });

    // calculate prices
    const { itemsPrice, taxPrice, shippingPrice, totalPrice } =
      calcPrices(dbOrderItems);

    const order = new Order({
      orderItems: dbOrderItems,
      user: req.user._id,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
    });

    const createdOrder = await order.save();

    res.status(201).json(createdOrder);
  }
});

// @desc Get logged in user orders
// @route GET /api/orders/myorders
// @access Private
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id });

  res.status(200).json(orders);
});

// @desc Get order by id
// @route GET /api/orders/:id
// @access Private
const getOrderById = asyncHandler(async (req, res) => {
  // First it will find the Order by its ID and then it will add name and email from user collection
  const order = await Order.findById(req.params.id).populate(
    "user",
    "name email"
  );

  const isOrderOwner =
    order?.user?._id?.toString() === req.user._id.toString() ||
    order?.user?.toString() === req.user._id.toString();

  if (order && (isOrderOwner || req.user.isAdmin)) {
    res.status(200).json(order);
  } else if (order) {
    res.status(403);
    throw new Error("Not authorized to view this order.");
  } else {
    res.status(404);
    throw new Error("Order not found.");
  }
});

// @desc Update order to delivered
// @route PUT /api/orders/:id/deliver
// @access Private/Admin
const updateOrderToDelivered = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (order) {
    order.isDelivered = true;
    order.deliveredAt = Date.now();

    const updatedOrder = await order.save();

    res.status(200).json(updatedOrder);
  } else {
    res.status(404);
    throw new Error("Order not found");
  }
});

// @desc get all orders
// @route GET /api/orders/
// @access Private/Admin
const getOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({}).populate("user", "id name");
  res.status(200).json(orders);
});

export {
  addOrderItems,
  getMyOrders,
  getOrderById,
  getOrders,
  updateOrderToDelivered,
  initiateKhalti,
  khaltiCallback,
};
