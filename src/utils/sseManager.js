const clients = new Map(); // userId (string) → res

export const sseManager = {
  add(userId, res) {
    clients.set(userId, res);
  },
  remove(userId) {
    clients.delete(userId);
  },
  send(userId, data) {
    const res = clients.get(userId);
    if (res) res.write(`data: ${JSON.stringify(data)}\n\n`);
  },
};