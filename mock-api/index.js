require("dotenv").config();
require("../consumer");
const http = require("http");

const express = require("express");
const cors = require("cors");
const connectMongoDB = require("../db/connection");
const { connectRabbitMQ } = require("./rabbitmq");
const { setupWebSocket } = require("../ws-server");
const MockAPI = require("./mockController");
const AdminController = require("./AdminController ");
const { createLimiter } = require("./utils/rateLimiter");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(cors());

const mockLimiter = createLimiter(5, 10); // 5 requests each 10s
app.use("/mock", mockLimiter);

app.post("/mock/new-user", MockAPI.newUser);
app.post("/mock/new-order", MockAPI.newOrder);
app.post("/mock/order-update", MockAPI.updateOrderStatus);
app.post("/mock/new-product", MockAPI.newProducts);

app.get("/api/users", AdminController.getUsers.bind(AdminController));
app.get("/api/orders", AdminController.getOrders.bind(AdminController));
app.get(
  "/api/order-items",
  AdminController.getOrderItems.bind(AdminController)
);
app.get("/api/products", AdminController.getProducts.bind(AdminController));
app.get(
  "/api/orders-user",
  AdminController.getOrdersByUser.bind(AdminController)
);
app.get(
  "/api/order-items",
  AdminController.getOrderItemsByOrderId.bind(AdminController)
);
app.get(
  "/api/sales-overview",
  AdminController.getSalesOverview.bind(AdminController)
);
app.get(
  "/api/status-count",
  AdminController.getOrderStatusCounts.bind(AdminController)
);
app.get(
  "/api/products-type-count",
  AdminController.getProductTypeStats.bind(AdminController)
);

setupWebSocket(server);

// Run server only after MongoDB + RabbitMQ are connected
async function startServer() {
  try {
    await connectMongoDB();
    await connectRabbitMQ();

    server.listen(PORT, () => {
      console.log(
        `Mock API & WebSocket server running at http://localhost:${PORT}`
      );
    });
  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
}

startServer();
