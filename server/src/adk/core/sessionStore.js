/**
 * ADK Session Store — Redis + Map Fallback
 * 优先 Redis 持久化，不可用时自动降级到内存 Map
 */
import { cacheGet, cacheSet, cacheDel } from '../../dao/redis.js';
import logger from '../../utils/logger.js';

const PREFIX = 'adk:sess:';
const DEFAULT_TTL = 3600; // 1 小时

const memFallback = new Map();

export class SessionStore {
  constructor(ttl = DEFAULT_TTL) {
    this.ttl = ttl;
  }

  async get(sessionId) {
    const key = PREFIX + sessionId;
    try {
      const val = await cacheGet(key);
      if (val) return val;
      // cacheGet 内部有 Map fallback，但加了前缀，需额外处理
      return memFallback.get(sessionId) || null;
    } catch (e) {
      logger.warn('[SessionStore] Redis get 失败，降级内存', { sessionId, error: e.message });
      return memFallback.get(sessionId) || null;
    }
  }

  async set(sessionId, session) {
    const key = PREFIX + sessionId;
    const data = session.toJSON ? session.toJSON() : session;
    try {
      await cacheSet(key, data, this.ttl);
    } catch (e) {
      logger.warn('[SessionStore] Redis set 失败，降级内存', { sessionId, error: e.message });
      memFallback.set(sessionId, data);
    }
  }

  async delete(sessionId) {
    const key = PREFIX + sessionId;
    try {
      await cacheDel(key);
    } catch (e) {
      logger.warn('[SessionStore] Redis delete 失败，降级内存', { sessionId, error: e.message });
      memFallback.delete(sessionId);
    }
  }

  async has(sessionId) {
    const val = await this.get(sessionId);
    return val !== null;
  }

  /** 更新 session TTL（续期） */
  async touch(sessionId) {
    const val = await this.get(sessionId);
    if (val) await this.set(sessionId, val);
  }

  /** 启动后台清理过期 session（仅内存 fallback） */
  startCleanup(intervalMs = 600_000) {
    this._cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [k, v] of memFallback) {
        if (v?.createdAt && now - v.createdAt > this.ttl * 1000) {
          memFallback.delete(k);
        }
      }
    }, intervalMs);
    if (this._cleanupTimer && typeof this._cleanupTimer.unref === 'function') {
      this._cleanupTimer.unref();
    }
    return this;
  }

  stopCleanup() {
    if (this._cleanupTimer) clearInterval(this._cleanupTimer);
  }

  /** 从原始 JSON 重新水化 Session */
  static async hydrate(sessionData, SessionClass) {
    if (!sessionData) return null;
    if (!SessionClass) {
      const { Session } = await import('./session.js');
      SessionClass = Session;
    }
    const session = new SessionClass({
      id: sessionData.id,
      userId: sessionData.userId,
    });
    if (sessionData.state) {
      for (const [k, v] of Object.entries(sessionData.state)) {
        session.state.set(k, v);
      }
    }
    session.createdAt = sessionData.createdAt || Date.now();
    session.updatedAt = sessionData.updatedAt || Date.now();
    return session;
  }
}

export default SessionStore;
