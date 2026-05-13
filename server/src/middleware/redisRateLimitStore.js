/**
 * express-rate-limit Redis Store
 *
 * 多实例共享计数器，解决默认 MemoryStore 在水平扩缩容时限流失效的问题。
 * 依赖现有 Redis DAO（自动 fallback 到内存）。
 */
import { getRedis } from '../dao/redis.js';
import logger from '../utils/logger.js';

export class RedisRateLimitStore {
  constructor(windowMs = 60000, prefix = 'rl') {
    this.windowMs = windowMs;
    this.prefix = prefix;
    this._memFallback = new Map();
    this._cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [k, v] of this._memFallback) {
        if (now > v.resetTime) this._memFallback.delete(k);
      }
    }, 30000).unref();
  }

  prefixFor(key) {
    return `${this.prefix}::${key}`;
  }

  async increment(key) {
    const rKey = this.prefixFor(key);
    try {
      const r = await getRedis();
      if (!r) return this._memIncrement(key);

      const count = await r.incr(rKey);
      if (count === 1) await r.expire(rKey, Math.ceil(this.windowMs / 1000));
      const ttl = await r.ttl(rKey);
      return {
        totalHits: count,
        resetTime: ttl > 0 ? new Date(Date.now() + ttl * 1000) : undefined,
      };
    } catch (err) {
      logger.warn('[RedisStore] increment failed, using memory fallback', { key, err: err.message });
      return this._memIncrement(key);
    }
  }

  async decrement(key) {
    const rKey = this.prefixFor(key);
    try {
      const r = await getRedis();
      if (!r) { this._memDecrement(key); return; }
      const count = await r.decr(rKey);
      if (count <= 0) await r.del(rKey);
    } catch (err) {
      logger.warn('[RedisStore] decrement failed', { key, err: err.message });
      this._memDecrement(key);
    }
  }

  async resetKey(key) {
    const rKey = this.prefixFor(key);
    try {
      const r = await getRedis();
      if (!r) { this._memFallback.delete(key); return; }
      await r.del(rKey);
    } catch { this._memFallback.delete(key); }
  }

  async shutdown() {
    clearInterval(this._cleanupTimer);
    this._memFallback.clear();
  }

  // ── 内存回退──
  _memIncrement(key) {
    let entry = this._memFallback.get(key);
    const now = Date.now();
    if (!entry || now > entry.resetTime) {
      entry = { count: 1, resetTime: now + this.windowMs };
    } else {
      entry.count++;
    }
    this._memFallback.set(key, entry);
    return { totalHits: entry.count, resetTime: new Date(entry.resetTime) };
  }

  _memDecrement(key) {
    const entry = this._memFallback.get(key);
    if (!entry) return;
    entry.count = Math.max(0, entry.count - 1);
    if (entry.count === 0) this._memFallback.delete(key);
  }
}
