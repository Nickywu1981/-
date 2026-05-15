import { createClient } from 'redis';
import config from '../config/index.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { BusinessError } from '../utils/businessError.js';
import { registerInterval } from '../utils/shutdownRegistry.js';
import logger from '../utils/logger.js';
const redisConfig = config.redis;

// 内存 fallback（开发/无 Redis 环境）
const memStore = new Map();
const MAX_MEM_SIZE = 1000;

function evictOldest() {
  if (memStore.size >= MAX_MEM_SIZE) {
    const oldest = memStore.keys().next().value;
    if (oldest) memStore.delete(oldest);
  }
}

export const _memCleanupTimer = setInterval(() => {
  try {
  const now = Date.now();
  for (const [key, entry] of memStore) {
    if (entry?._ts && now - entry._ts > 300000) memStore.delete(key);
  }
  } catch { /* Map 迭代安全，兜底防护 */ }
}, 60000).unref();
registerInterval(_memCleanupTimer);

const client = createClient({
  socket: {
    host: redisConfig.host,
    port: redisConfig.port,
    connectTimeout: 2000,
    reconnectStrategy: (retries) => Math.min(Math.pow(2, retries) * 100, 30000),
  },
  password: redisConfig.password || undefined,
});

client.on('error', (err) => { logger.error('[Redis] 连接错误', { error: err.message }); });

let triedConnect = false;

export async function getRedis() {
  if (client.isReady) return client;
  if (!triedConnect) {
    triedConnect = true;
    try {
      await client.connect();
      logger.info('[Redis] 连接成功');
      return client;
    } catch (err) {
      logger.error('[Redis] 初始连接失败，将依赖内置 retryStrategy 自动重连', { error: err.message });
      // 客户端内置 reconnectStrategy 会持续重试，isReady 变为 true 时自动恢复
    }
  }
  // 仍在重连中或已失败，回退到内存缓存
  return null;
}

export async function cacheGet(key) {
  try {
    const r = await getRedis();
    if (!r) {
      _healthMetrics.fallbackActivations++;
      const entry = memStore.get(key);
      if (entry && typeof entry === 'object' && '_v' in entry) {
        _healthMetrics.hits++;
        return entry._v;
      }
      _healthMetrics.misses++;
      return entry;
    }
    const val = await r.get(key);
    if (val) { _healthMetrics.hits++; return JSON.parse(val); }
    _healthMetrics.misses++;
    return null;
  } catch (e) {
    logger.warn('[Redis] get 降级到内存', { key, error: e.message });
    _healthMetrics.fallbackActivations++;
    const memVal = memStore.get(key) || null;
    if (memVal) _healthMetrics.hits++; else _healthMetrics.misses++;
    return memVal;
  }
}

export async function cacheSet(key, value, ttl = 300) {
  try {
    const r = await getRedis();
    if (!r) {
      const v = typeof value === 'string' ? value : JSON.stringify(value);
      if (Buffer.byteLength(v, 'utf8') > 512 * 1024) { logger.warn(`[cache] Skip oversized entry (${key}: ${Math.round(Buffer.byteLength(v, 'utf8') / 1024)}KB > 512KB)`); return; }
      memStore.set(key, { _v: value, _ts: Date.now() }); evictOldest(); return;
    }
    await r.set(key, JSON.stringify(value), { EX: ttl });
  } catch (e) { logger.warn('[Redis] set 降级到内存', { key, error: e.message }); const v = typeof value === 'string' ? value : JSON.stringify(value); if (Buffer.byteLength(v, 'utf8') <= 512 * 1024) { memStore.set(key, { _v: value, _ts: Date.now() }); evictOldest(); } }
}

export async function cacheDel(key) {
  try {
    const r = await getRedis();
    if (!r) { memStore.delete(key); return; }
    await r.del(key);
  } catch { memStore.delete(key); }
}

export async function ping() {
  try {
    const r = await getRedis();
    if (!r) throw new BusinessError(ERROR_CODE.INTERNAL_ERROR, 'Redis not available');
    await r.ping();
    return true;
  } catch (e) { logger.warn('[Redis] ping 失败', { error: e.message }); throw new BusinessError(ERROR_CODE.INTERNAL_ERROR, 'Redis ping failed'); }
}

export async function quit() {
  if (client.isReady) {
    try { await client.quit(); } catch { /* ignore */ }
  }
  stopHealthPing();
}

// ==================== 缓存击穿保护（互斥锁） ====================

const mutexLocks = new Map(); // key → Promise
const MAX_MUTEX_LOCKS = 1000;

/**
 * cacheGet + 互斥锁：并发 miss 时仅第一个请求回源，其余等待共享结果
 * @param {string} key - 缓存键
 * @param {Function} fetchFn - 回源函数 () => value
 * @param {number} ttl - 缓存 TTL (秒)
 * @param {number} lockTimeout - 锁超时 (ms)
 */
export async function cacheGetWithLock(key, fetchFn, ttl = 300, lockTimeout = 5000) {
  const cached = await cacheGet(key);
  if (cached !== null) return cached;

  if (mutexLocks.has(key)) return mutexLocks.get(key);

  if (mutexLocks.size >= MAX_MUTEX_LOCKS) {
    logger.warn('[Redis] mutexLocks over cap, clearing oldest', { size: mutexLocks.size });
    const oldest = mutexLocks.keys().next().value;
    if (oldest) mutexLocks.delete(oldest);
  }

  const lockPromise = (async () => {
    try {
      const value = await fetchFn();
      // 仅在锁仍有效时写入缓存（超时已被删除则跳过，避免脏写）
      if (mutexLocks.has(key)) {
        await cacheSet(key, value, ttl);
      }
      return value;
    } finally {
      mutexLocks.delete(key);
    }
  })();

  // 锁超时保护
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => { mutexLocks.delete(key); reject(new Error('Cache lock timeout')); }, lockTimeout)
  );

  mutexLocks.set(key, Promise.race([lockPromise, timeoutPromise]));
  return mutexLocks.get(key);
}

// ==================== 后台健康探活 ====================

let _healthTimer = null;
let _redisReady = true;
let _consecutiveFails = 0;
const _healthMetrics = { hits: 0, misses: 0, fallbackActivations: 0, connectionLosses: 0, latencyMs: [] };

export function getRedisMetrics() {
  const recent = _healthMetrics.latencyMs.slice(-20);
  const avgLatency = recent.length > 0 ? Math.round(recent.reduce((s, v) => s + v, 0) / recent.length) : 0;
  return {
    ready: _redisReady,
    hits: _healthMetrics.hits,
    misses: _healthMetrics.misses,
    fallbackActivations: _healthMetrics.fallbackActivations,
    connectionLosses: _healthMetrics.connectionLosses,
    avgLatencyMs: avgLatency,
    consecutiveFails: _consecutiveFails,
  };
}

export function isRedisReady() {
  return _redisReady;
}

export function startHealthPing(intervalMs = 30000) {
  if (_healthTimer) return;
  _healthTimer = setInterval(async () => {
    const start = Date.now();
    try {
      if (client.isReady) {
        await client.ping();
        _healthMetrics.latencyMs.push(Date.now() - start);
        if (_healthMetrics.latencyMs.length > 100) _healthMetrics.latencyMs.shift();
        _consecutiveFails = 0;
        if (!_redisReady) {
          _redisReady = true;
          logger.info('[Redis] 健康探活恢复，Redis 已重新可用');
        }
      } else {
        _consecutiveFails++;
        _handleRedisDown();
      }
    } catch {
      _consecutiveFails++;
      _handleRedisDown();
    }
  }, intervalMs);
  if (_healthTimer.unref) _healthTimer.unref();
  registerInterval(_healthTimer);
  logger.info('[Redis] 健康探活已启动', { intervalMs });
}

function _handleRedisDown() {
  _healthMetrics.connectionLosses++;
  if (_consecutiveFails >= 3 && _redisReady) {
    _redisReady = false;
    logger.error('[Redis] 连续 3 次探活失败，标记不可用');
  }
}

export function stopHealthPing() {
  if (_healthTimer) { clearInterval(_healthTimer); _healthTimer = null; }
}
