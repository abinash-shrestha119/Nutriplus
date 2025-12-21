import React from "react";
import { Link, useParams, } from "react-router-dom";
import {
  Row,
  Col,
  ListGroup,
  Image,
  Button,
  Card,
} from "react-bootstrap";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import Message from "../../components/message/message";
import { useDispatch } from "react-redux";
import { clearCartItems } from "../../slices/cartSlice"
import { useEffect } from "react";

import Loader from "../../components/loader/loader";
import {
  useGetOrderDetailsQuery,
  useDeliverOrderMutation,
} from "../../slices/ordersApiSlice";



const OrderScreen = () => {
  const dispatch = useDispatch();
  const { id: orderId } = useParams();

  const {
    data: order,
    refetch,
    isLoading,
    error,
  } = useGetOrderDetailsQuery(orderId);

  const [deliverOrder, { isLoading: loadingDeliver }] =
    useDeliverOrderMutation();

  const { userInfo } = useSelector((state) => state.auth);


  useEffect(() => {
  if (order?.isPaid) {
    dispatch(clearCartItems());
  }
}, [order?.isPaid, dispatch]);

  /* =========================
     KHALTI PAYMENT HANDLER
     ========================= */
const handleKhaltiPayment = async () => {
  try {
    const res = await fetch(
      `/api/orders/${order._id}/khalti/initiate`,
      {
        method: "POST", // ✅ MUST be POST
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userInfo.token}`, // ✅ REQUIRED
        },
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Khalti initiation failed");
    }

    // ✅ Redirect to Khalti Hosted Payment Page
    window.location.href = data.payment_url;

  } catch (error) {
    toast.error(error.message);
  }
};

  const deliverOrderHandler = async () => {
    try {
      await deliverOrder(orderId);
      refetch();
      toast.success("Order Delivered");
    } catch (err) {
      toast.error(err?.data?.message || err.message);
    }
  };

  return isLoading ? (
    <Loader />
  ) : error ? (
    <Message variant="danger">
      {error?.data?.message || error.error}
    </Message>
  ) : (
    <div className="screen">
      <h1 className="title-style">Order {order._id}</h1>
      <Row>
        <Col md={8}>
          <ListGroup className="card-style order-card-wrap">
            <ListGroup.Item className="list-item">
              <h2 className="title-style">Shipping</h2>
              <p><strong>Name:</strong> {order.user.name}</p>
              <p><strong>Email:</strong> {order.user.email}</p>
              <p>
                <strong>Address:</strong>{" "}
                {order.shippingAddress.address},{" "}
                {order.shippingAddress.city},{" "}
                {order.shippingAddress.postalCode},{" "}
                {order.shippingAddress.country}
              </p>
              {order.isDelivered ? (
                <Message variant="success">
                  Delivered on {order.deliveredAt}
                </Message>
              ) : (
                <Message variant="danger">Not Delivered</Message>
              )}
            </ListGroup.Item>

            <ListGroup.Item className="list-item">
              <h2 className="title-style">Payment</h2>
              <p><strong>Method:</strong> Khalti</p>
              {order.isPaid ? (
                <Message variant="success">
                  Paid on {order.paidAt}
                </Message>
              ) : (
                <Message variant="danger">Not Paid</Message>
              )}
            </ListGroup.Item>

            <ListGroup.Item className="list-item">
              <h2 className="title-style">Order Items</h2>
              {order.orderItems.map((item, index) => (
                <ListGroup.Item key={index} className="list-item">
                  <Row className="align-items-center">
                    <Col md={1}>
                      <Image src={item.image} fluid rounded />
                    </Col>
                    <Col>
                      <Link to={`/product/${item.product}`}>
                        {item.name}
                      </Link>
                    </Col>
                    <Col md={4}>
                      {item.qty} × {item.price} ={" "}
                      {item.qty * item.price}
                    </Col>
                  </Row>
                </ListGroup.Item>
              ))}
            </ListGroup.Item>
          </ListGroup>
        </Col>

        <Col md={4}>
          <Card className="card-style order-card-wrap">
            <ListGroup variant="flush">
              <ListGroup.Item className="list-item">
                <h2 className="title-style">Order Summary</h2>
              </ListGroup.Item>

              <ListGroup.Item className="list-item">
                <Row><Col>Items</Col><Col>{order.itemsPrice}</Col></Row>
                <Row><Col>Shipping</Col><Col>{order.shippingPrice}</Col></Row>
                <Row><Col>Tax</Col><Col>{order.taxPrice}</Col></Row>
                <Row><Col>Total</Col><Col>{order.totalPrice}</Col></Row>
              </ListGroup.Item>

              {!order.isPaid && (
                <ListGroup.Item className="list-item">
                  <Button
                    className="btn btn-block card-button-style"
                    onClick={handleKhaltiPayment}
                  >
                    Pay with Khalti
                  </Button>
                </ListGroup.Item>
              )}

              {loadingDeliver && <Loader />}

              {userInfo &&
                userInfo.isAdmin &&
                order.isPaid &&
                !order.isDelivered && (
                  <ListGroup.Item className="list-item">
                    <Button
                      className="btn btn-block card-button-style"
                      onClick={deliverOrderHandler}
                    >
                      Mark As Delivered
                    </Button>
                  </ListGroup.Item>
                )}
            </ListGroup>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default OrderScreen;
