// Map of userId → Set of SSE response objects
const clients = new Map();

function addClient(userId, res) {
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId).add(res);
  console.log(`[SSE] User ${userId} connected (${clients.get(userId).size} connections)`);
}

function removeClient(userId, res) {
  if (!clients.has(userId)) return;
  clients.get(userId).delete(res);
  if (clients.get(userId).size === 0) clients.delete(userId);
  console.log(`[SSE] User ${userId} disconnected`);
}

function broadcastToUser(userId, eventType, data) {
  if (!clients.has(userId)) return;
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients.get(userId)) {
    try { res.write(payload); } catch { clients.get(userId).delete(res); }
  }
}

function getClientCount() {
  let n = 0;
  for (const s of clients.values()) n += s.size;
  return n;
}

module.exports = { addClient, removeClient, broadcastToUser, getClientCount };
