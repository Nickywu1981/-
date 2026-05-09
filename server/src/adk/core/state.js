/**
 * ADK 核心原语 — State（会话内状态）
 * 键值字典，同一 Session 内多 Agent 共享读写
 */
export class State {
  constructor(initial = {}) {
    this._store = new Map(Object.entries(initial));
  }

  get(key) { return this._store.get(key); }
  set(key, value) { this._store.set(key, value); return this; }
  has(key) { return this._store.has(key); }
  delete(key) { return this._store.delete(key); }
  getAll() { return Object.fromEntries(this._store); }
  clear() { this._store.clear(); }

  /** 原子更新 — 读取 → transform → 写回 */
  async update(key, transform) {
    const current = this._store.get(key);
    const next = await transform(current);
    this._store.set(key, next);
    return next;
  }
}
