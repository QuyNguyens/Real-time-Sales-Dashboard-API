// consumer/handlers/handleNewOrder.js
const { faker } = require("@faker-js/faker");

const User = require("../../db/models/User");
const Order = require("../../db/models/Order");
const OrderItem = require("../../db/models/OrderItem");

async function handleNewOrder(data) {
  let user;

  const users = await User.aggregate([{ $sample: { size: 1 } }]);
  if (users.length > 0) {
    user = users[0];
  } else {
    user = await User.create({
      name: data.customerName || faker.person.fullName(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      address: faker.location.streetAddress(),
      avatar: faker.image.avatar(),
    });
    console.log("User mới được tạo:", user.name);
  }

  const order = await Order.create({
    orderId: data.orderId,
    userId: user._id,
    amount: data.amount,
    status: data.status,
    timestamp: data.timestamp,
  });

  const items = data.items.map((item) => ({
    orderId: order._id,
    name: item.name,
    image: item.image,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    costPrice: item.costPrice,
    total: item.total,
    createdAt: new Date(data.timestamp),
    updatedAt: new Date(data.timestamp),
  }));

  await OrderItem.insertMany(items);
  console.log(`Đã lưu đơn hàng ${order.orderId} với ${items.length} sản phẩm`);
}

module.exports = handleNewOrder;
