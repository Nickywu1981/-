import { createClient } from 'redis';
import config from '../config/index.js';
import { BusinessError } from '../utils/businessError.js';
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

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memStore) {
    if (entry?._ts && now - entry._ts > 300000) memStore.delete(key);
  }
}, 60000);

const client = createClient({
  socket: {
    host: redisConfig.host,
    port: redisConfig.port,
    connectTimeout: 2000,
    reconnectStrategy: (retries) => Math.min(retries * 1000, 30000),
  },
  password: redisConfig.password || undefined,
});

client.on('error', () => { /* Redis 不可用，走内存缓存 */ });

let connected = false;
let triedConnect = false;

export async function getRedis() {
  if (connected) return client;
  if (!triedConnect) {
    triedConnect = true;
    try {
      await client.connect();
      connected = true;
      return client;
    } catch { /* 无 Redis，使用内存缓存 */ }
  }
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
    if (!r) { memStore.set(key, { _v: value, _ts: Date.now() }); evictOldest(); return; }
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
  } catch { throw new BusinessError(503, 'Redis ping failed'); }
}

export async function quit() {
  if (connected) {
    try { await client.quit(); } catch { /* ignore */ }
    connected = false;
  }
}

export default { getRedis, cacheGet, cacheSet, cacheDel, ping, quit };
