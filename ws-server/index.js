const WebSocket = require("ws");

const clients = new Set();

function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server }); // gắn vào cùng server Express

  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");
    clients.add(ws);

    ws.on("close", () => {
      console.log("WebSocket client disconnected");
      clients.delete(ws);
    });
  });
}

function broadcast(data) {
  const message = JSON.stringify(data);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

module.exports = {
  setupWebSocket,
  broadcast,
};
