import { createClient } from 'redis';
import config from '../config/index.js';
import { BusinessError } from '../utils/businessError.js';
const redisConfig = config.redis;

// 内存 fallback（开发/无 Redis 环境）
const memStore = new Map();

const client = createClient({
  socket: {
    host: redisConfig.host,
    port: redisConfig.port,
    connectTimeout: 2000,
    reconnectStrategy: false, // 不重连
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
    if (!r) return memStore.get(key) || null;
    const val = await r.get(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return memStore.get(key) || null;
  }
}

export async function cacheSet(key, value, ttl = 300) {
  try {
    const r = await getRedis();
    if (!r) { memStore.set(key, value); return; }
    await r.set(key, JSON.stringify(value), { EX: ttl });
  } catch { memStore.set(key, value); }
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
