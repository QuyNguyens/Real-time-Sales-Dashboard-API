const Order = require("../../db/models/Order");

async function handleNewUser(data) {
  const { orderId, status } = data;

  if (!orderId || !status) {
    console.warn("⚠️ Missing orderId or status in message");
    return;
  }

  try {
    const updatedOrder = await Order.findOneAndUpdate(
      { orderId },
      { status },
      { new: true }
    );

    if (!updatedOrder) {
      console.warn("Order not found:", orderId);
      return;
    }

    console.log(`Order ${orderId} status updated to: ${status}`);
  } catch (err) {
    console.error("Failed to update order status:", err);
  }
}
