// consumer/handlers/handleNewUser.js
const User = require("../../db/models/User");

async function handleNewUser(data) {
  const existing = await User.findOne({ name: data.name });
  if (existing) {
    console.log("User đã tồn tại:", existing.name);
    return;
  }

  const user = await User.create({ name: data.name });
  console.log("User mới được tạo:", user.name);
}

module.exports = handleNewUser;
