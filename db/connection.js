const mongoose = require("mongoose");
const env = require("../config/env");

const User = require("./models/User");
const Product = require("./models/Product");
const Order = require("./models/Order");
const OrderItem = require("./models/OrderItem");

async function connectionMongoDB() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log("✅ MongoDB connected");
    //await Order.updateMany({}, { $set: { status: "delivered" } });
    // await Promise.all([
    //   User.deleteMany({}),
    //   Product.deleteMany({}),
    //   Order.deleteMany({}),
    //   OrderItem.deleteMany({}),
    // ]);
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
}

module.exports = connectionMongoDB;
