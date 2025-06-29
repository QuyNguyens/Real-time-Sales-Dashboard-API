// consumer/handlers/handleNewProduct.js
const Product = require("../../db/models/Product");

async function handleNewProduct(data) {
  const products = await Product.insertMany(data.products);

  console.log(`created ${products.length} products`);
}

module.exports = handleNewProduct;
