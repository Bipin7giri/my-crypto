export type Trade = {
  id: string;
  stock: string;
  leverage: number;
  capital: number;
  pnl: number;
  createdAt: string;
};

const store = new Map<string, Trade[]>();

export const db = {
  list(userId: string) {
    return store.get(userId) ?? [];
  },
  add(userId: string, trade: Trade) {
    const prev = store.get(userId) ?? [];
    store.set(userId, [trade, ...prev]);
    return trade;
  },
  remove(userId: string, id: string) {
    const prev = store.get(userId) ?? [];
    store.set(userId, prev.filter(t => t.id !== id));
  }
};
