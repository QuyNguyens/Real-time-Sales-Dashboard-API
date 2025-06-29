const amqp = require("amqplib");
const env = require('../config/env');
const QUEUE_NAME = env.QUEUE_NAME;

let channel = null;

// connect to rabbitMq
async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(env.AMQP_URL);
    channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    console.log("Connected to RabbitMQ");
  } catch (error) {
    console.error("RabbitMQ connection error:", error);
    process.exit(1);
  }
}

/**
 * Send message into queue
 * @param {Object} message - Json data need to send
 */

function sendMessage(message) {
  if (!channel) {
    throw new Error(
      "RabbitMQ channel not initialized. Call connectRabbitMQ() first."
    );
  }

  const payload = Buffer.from(JSON.stringify(message));
  channel.sendToQueue(QUEUE_NAME, payload, { persistent: true });
  console.log("Message sent to queue:", message.type);
}

module.exports = {
  connectRabbitMQ,
  sendMessage,
};
