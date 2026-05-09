/**
 * ADK 核心原语 — Session（会话）
 * 有状态对话线程，持有 events 历史 + State + Memory
 */
import { State } from './state.js';

let _idCounter = 0;

export class Session {
  /** @param {{ id?: string, userId?: string, agentId?: string, state?: object, createdAt?: number, updatedAt?: number }} */
  constructor(opts = {}) {
    this.id = opts.id || `sess_${Date.now()}_${++_idCounter}`;
    this.userId = opts.userId ?? null;
    this.agentId = opts.agentId ?? null;
    this.state = new State();
    this.events = [];           // Event[]
    this.createdAt = opts.createdAt || Date.now();
    this.updatedAt = opts.updatedAt || Date.now();

    // 从存储恢复 state
    if (opts.state) {
      for (const [k, v] of Object.entries(opts.state)) {
        this.state.set(k, v);
      }
    }
  }

  pushEvent(event) {
    this.events.push(event);
    this.updatedAt = Date.now();
  }

  lastEvent(type) {
    if (!type) return this.events[this.events.length - 1];
    for (let i = this.events.length - 1; i >= 0; i--) {
      if (this.events[i].type === type) return this.events[i];
    }
    return null;
  }

  toJSON() {
    return {
      id: this.id, userId: this.userId, agentId: this.agentId,
      state: this.state.getAll(), eventsCount: this.events.length,
      createdAt: this.createdAt, updatedAt: this.updatedAt,
    };
  }
}
