const amqp = require("amqplib");
const UserController = require("./handlers/handleNewUser");
const OrderController = require("./handlers/handleNewOrder");
const ProductController = require("./handlers/handleNewProduct");
const handleOrderStatusUpdate = require("./handlers/handleOrderStatusUpdate");
const { broadcast } = require("../ws-server");
const env = require("../config/env");

const QUEUE_NAME = env.QUEUE_NAME;

async function startConsumer() {
  const conn = await amqp.connect(env.AMQP_URL);
  const channel = await conn.createChannel();
  await channel.assertQueue(QUEUE_NAME, { durable: true });

  console.log("Listening for messages...");

  channel.consume(QUEUE_NAME, async (msg) => {
    if (!msg) return;

    const data = JSON.parse(msg.content.toString());
    console.log("Received:", data.type);

    try {
      switch (data.type) {
        case "new_user":
          await UserController.create(data);
          broadcast(data);
          break;
        case "new_order":
          await OrderController.newOrder(data);
          broadcast(data);
          break;
        case "order_status_update":
          await OrderController.updateOrderStatus(data);
          broadcast(data);
          break;
        case "delete_order":
          await OrderController.deleteOrder(data);
          broadcast(data);
          break;
        case "new_product":
          await ProductController.create(data);
          break;
        case "delete_product":
          await ProductController.delete(data);
          broadcast(data);
          break;
        case "delete_user":
          await UserController.delete(data);
          broadcast(data);
          break;
        case "order_status_update":
          await handleOrderStatusUpdate(data);
          broadcast(data);
          break;
        default:
          console.log("Unknown message type:", data.type);
      }
      channel.ack(msg);
    } catch (err) {
      console.error("Error processing message:", err);
      // no ack to be able to reprocess
    }
  });
}

startConsumer().catch(console.error);
