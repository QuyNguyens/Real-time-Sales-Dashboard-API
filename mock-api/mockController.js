const { faker } = require("@faker-js/faker");
const { sendMessage } = require("./rabbitmq");
const Product = require("../db/models/Product");

class MockAPI {
  newUser(req, res) {
    // const now = new Date();
    // const oneYearAgo = new Date();
    // oneYearAgo.setFullYear(now.getFullYear() - 1);

    const count = parseInt(req.query.count) || 1;
    const users = [];

    for (let i = 0; i < count; i++) {
      const user = {
        type: "new_user",
        name: faker.person.fullName(),
        email: faker.internet.email(),
        phone: faker.phone.number("09########"),
        address: faker.location.streetAddress(true),
        avatar: faker.image.avatar(),
        timestamp: new Date().toISOString(),
      };

      sendMessage(user);
      users.push(user);
    }

    res.json({ status: "ok", count, users });
  }

  async newOrder(req, res) {
    try {
      const count = faker.number.int({ min: 3, max: 7 });

      const randomProducts = await Product.aggregate([
        { $sample: { size: count } },
      ]);

      if (randomProducts.length === 0) {
        return res
          .status(400)
          .json({ error: "products is unoccupied in database." });
      }

      const items = randomProducts.map((product) => {
        const quantity = faker.number.int({ min: 3, max: 7 });
        return {
          name: product.name,
          quantity,
          image: product.image,
          costPrice: product.costPrice,
          unitPrice: product.unitPrice,
          total: quantity * product.unitPrice,
        };
      });

      const amount = items.reduce((sum, i) => sum + i.total, 0);

      const status = faker.helpers.arrayElement([
        "new",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ]);

      function getPastTimestamp(daysAgo) {
        const d = new Date();
        d.setDate(d.getDate() - daysAgo);
        return d.toISOString();
      }

      const message = {
        type: "new_order",
        orderId: faker.string.uuid(),
        customerName: faker.person.fullName(),
        items,
        amount,
        status,
        timestamp: getPastTimestamp(0),
      };

      sendMessage(message);
      res.json({ status: "ok", message });
    } catch (err) {
      console.error("something went wrong:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async seedOrders(req, res) {
    try {
      const { orderCount = 1 } = req.query;

      // const now = new Date();
      // const oneYearAgo = new Date();
      // oneYearAgo.setFullYear(now.getFullYear() - 1);

      const statuses = [
        "new",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ];

      for (let i = 0; i < orderCount; i++) {
        const itemCount = faker.number.int({ min: 3, max: 7 });

        const randomProducts = await Product.aggregate([
          { $sample: { size: itemCount } },
        ]);

        if (randomProducts.length === 0) {
          console.warn("No products in database, skipping order");
          continue;
        }

        const items = randomProducts.map((product) => {
          const quantity = faker.number.int({ min: 3, max: 7 });
          return {
            name: product.name,
            quantity,
            image: product.image,
            costPrice: product.costPrice,
            unitPrice: product.unitPrice,
            total: quantity * product.unitPrice,
          };
        });

        const amount = items.reduce((sum, i) => sum + i.total, 0);
        const status = faker.helpers.arrayElement(statuses);
        const timestamp = new Date().toISOString();

        const message = {
          type: "new_order",
          orderId: faker.string.uuid(),
          customerName: faker.person.fullName(),
          items,
          amount,
          status,
          timestamp: timestamp,
        };

        sendMessage(message);
      }

      res.json({
        status: "ok",
        message: `${orderCount} đơn hàng đã được tạo và gửi vào hàng đợi`,
      });
    } catch (err) {
      console.error("Lỗi khi tạo đơn hàng hàng loạt:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  newProducts(req, res) {
    const { count = 3 } = req.query;

    const products = Array.from({ length: count }).map(() => {
      const unitPrice = faker.number.int({ min: 100000, max: 500000 });
      const costPrice = faker.number.int({
        min: Math.floor(unitPrice * 0.5),
        max: Math.floor(unitPrice * 0.9),
      });

      return {
        name: faker.commerce.productName(),
        unitPrice,
        costPrice,
        type: faker.helpers.arrayElement([
          "quần áo",
          "điện thoại",
          "thiết bị điện tử",
          "giày dép",
          "khác",
        ]),
        image: faker.image.urlLoremFlickr({ category: "product" }),
      };
    });

    const message = {
      type: "new_product",
      products,
    };

    sendMessage(message);
    res.json({ status: "ok", products });
  }

  updateOrderStatus(req, res) {
    const { orderId, status } = req.body;

    console.log("orderId: ", orderId);

    const allowedStatuses = [
      "new",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status value." });
    }
    const message = {
      type: "order_status_update",
      orderId,
      status,
      timestamp: new Date().toISOString(),
    };

    sendMessage({
      type: "order_status_update",
      orderId,
      status,
      timestamp: new Date().toISOString(),
    });
    res.json({ status: "ok", message });
  }

  deleteOrder(req, res) {
    const { orderId } = req.query;
    const message = {
      type: "delete_order",
      orderId: orderId,
    };
    sendMessage(message);
    res.json({ status: "ok", message });
  }

  deleteProduct(req, res) {
    const { productId } = req.query;
    const message = {
      type: "delete_product",
      productId,
    };
    sendMessage(message);
    res.json({ status: "ok", message });
  }

  deleteUser(req, res) {
    const { userId } = req.query;
    const message = {
      type: "delete_user",
      userId,
    };
    sendMessage(message);
    res.json({ status: "ok", message });
  }
}

module.exports = new MockAPI();
