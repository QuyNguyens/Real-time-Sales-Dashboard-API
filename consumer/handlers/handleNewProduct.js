// consumer/handlers/handleNewProduct.js
const Product = require("../../db/models/Product");

class ProductController {
  async create(data) {
    const products = await Product.insertMany(data.products);

    console.log(`created ${products.length} products`);
  }

  async delete(data) {
    const { productId } = data;
    await Product.deleteOne({ _id: productId });
    console.log(`Đã xóa sản phẩm  ${productId}`);
  }
}

module.exports = new ProductController();
