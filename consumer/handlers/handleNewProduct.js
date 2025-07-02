// consumer/handlers/handleNewProduct.js
const Product = require("../../db/models/Product");
const { broadcast } = require("../../ws-server");

class ProductController {
  async create(data) {
    const products = await Product.insertMany(data.products);
    broadcast({ type: "new_product", products });
    console.log(`created ${products.length} products`);
  }

  async delete(data) {
    const { productId } = data;
    await Product.deleteOne({ _id: productId });
    console.log(`Đã xóa sản phẩm  ${productId}`);
  }
}

module.exports = new ProductController();
