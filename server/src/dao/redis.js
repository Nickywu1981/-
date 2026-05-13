import { createClient } from 'redis';
import config from '../config/index.js';
import { BusinessError } from '../utils/businessError.js';
import logger from '../utils/logger.js';
const redisConfig = config.redis;

// 内存 fallback（开发/无 Redis 环境）
const memStore = new Map();
const MAX_MEM_SIZE = 1000;

function evictOldest() {
  if (memStore.size > MAX_MEM_SIZE) {
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
      const entry = memStore.get(key);
      return entry && typeof entry === 'object' && '_v' in entry ? entry._v : entry;
    }
    const val = await r.get(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return memStore.get(key) || null;
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
  } catch { memStore.set(key, { _v: value, _ts: Date.now() }); evictOldest(); }
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
    if (!r) throw new BusinessError(503, 'Redis not available');
    await r.ping();
    return true;
  } catch (e) { logger.warn('[Redis] ping 失败', { error: e.message }); throw new BusinessError(503, 'Redis ping failed'); }
}

export async function quit() {
  if (client.isReady) {
    try { await client.quit(); } catch { /* ignore */ }
  }
}
