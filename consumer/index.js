const amqp = require("amqplib");
const handleNewOrder = require("./handlers/handleNewOrder");
const handleNewUser = require("./handlers/handleNewUser");
const handleNewProduct = require("./handlers/handleNewProduct");
const handleOrderStatusUpdate = require("./handlers/handleOrderStatusUpdate");
const { broadcast } = require("../ws-server");
const env = require('../config/env');

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
          await handleNewUser(data);
          broadcast(data);
          break;
        case "new_order":
          await handleNewOrder(data);
          broadcast(data);
          break;
        case "new_product":
          await handleNewProduct(data);
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
