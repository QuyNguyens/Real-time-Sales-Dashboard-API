// consumer/handlers/handleNewUser.js
const User = require("../../db/models/User");

class UserController {
  async create(data) {
    const existing = await User.findOne({ name: data.name });
    if (existing) {
      console.log("User đã tồn tại:", existing.name);
      return;
    }

    const user = await User.create({ name: data.name });
    console.log("User mới được tạo:", user.name);
  }

  async delete(data) {
    const { userId } = data;
    await User.deleteOne({ _id: userId });
    console.log(`Đã xóa user ${userId}`);
  }
}

module.exports = new UserController();
