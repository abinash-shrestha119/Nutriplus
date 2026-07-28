import dotenv from "dotenv";

dotenv.config();

const normalizeBaseUrl = (value) => {
  if (!value) return "";
  return value.trim().replace(/\/+$/, "");
};

const getHeaderOrigin = (req, headerName) => {
  const value = req.headers?.[headerName];

  if (!value) return "";

  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
};

export const buildKhaltiUrls = (req) => {
  const forwardedProto = Array.isArray(req.headers?.["x-forwarded-proto"])
    ? req.headers["x-forwarded-proto"][0]
    : req.headers?.["x-forwarded-proto"];
  const forwardedHost = Array.isArray(req.headers?.["x-forwarded-host"])
    ? req.headers["x-forwarded-host"][0]
    : req.headers?.["x-forwarded-host"];
  const host = forwardedHost
    ? `${forwardedProto || req.protocol || "http"}://${forwardedHost}`
    : "";

  const frontendUrl = normalizeBaseUrl(
    process.env.FRONTEND_URL ||
      getHeaderOrigin(req, "origin") ||
      getHeaderOrigin(req, "referer") ||
      "http://localhost:3000"
  );

  const backendUrl = normalizeBaseUrl(
    process.env.BACKEND_URL ||
      process.env.APP_URL ||
      host ||
      (req.get?.("host") ? `${req.protocol || "http"}://${req.get("host")}` : "") ||
      "http://localhost:5000"
  );

  return { backendUrl, frontendUrl };
};

export const buildKhaltiPaymentPayload = (order, req) => {
  const { backendUrl, frontendUrl } = buildKhaltiUrls(req);

  return {
    return_url: `${backendUrl}/api/orders/khalti/callback`,
    website_url: frontendUrl,
    amount: Math.round(order.totalPrice * 100),
    purchase_order_id: order._id,
    purchase_order_name: "Order Payment",
  };
};
