/**
 * 语义缓存服务 — Semantic Cache Service
 *
 * 策略：
 * 1. 精确匹配缓存（aiEngine 已有）— modelId + JSON.stringify(input)
 * 2. 语义相似度缓存 — SimHash + 汉明距离 < 阈值 → 复用缓存
 * 3. Redis 后端支持跨进程共享
 *
 * 使用场景：对文本类高频相似请求（翻译、SEO文本、标题生成）命中缓存
 */
import crypto from 'crypto';
import logger from '../utils/logger.js';

// ==================== 配置 ====================

const config = {
  backend: process.env.AI_CACHE_BACKEND || 'memory', // redis | memory
  ttlMs: parseInt(process.env.AI_CACHE_TTL_MS || '300000', 10), // 5min
  maxSize: parseInt(process.env.AI_CACHE_MAX_SIZE || '1000', 10),
  // 语义相似度
  semanticEnabled: process.env.AI_CACHE_SEMANTIC_ENABLED === 'true',
  simHashThreshold: parseInt(process.env.AI_CACHE_SIMHASH_THRESHOLD || '3', 10), // 汉明距离 <= 3
};

// ==================== Redis 惰性初始化 ====================

let _redis = null;
let _redisInitAttempted = false;

async function getRedis() {
  if (_redis) return _redis;
  if (_redisInitAttempted) return null;
  try {
    const { default: redisModule } = await import('../utils/redis.js');
    _redis = redisModule;
    logger.info('[SemanticCache] Redis 已连接');
  } catch {
    logger.warn('[SemanticCache] Redis 不可用，降级为内存模式');
  }
  _redisInitAttempted = true;
  return _redis;
}

// ==================== SimHash 实现 ====================

function simHash(text) {
  if (!text) return 0;

  const tokens = text.toLowerCase().split(/\s+/).filter(Boolean);
  const bitCount = 64;
  const v = new Int32Array(bitCount);

  for (const token of tokens) {
    const hash = _stringHash(token);
    for (let i = 0; i < bitCount; i++) {
      if (hash & (1 << (i % 32))) {
        v[i]++;
      } else {
        v[i]--;
      }
    }
  }

  let result = 0n;
  for (let i = 0; i < bitCount; i++) {
    if (v[i] > 0) result |= (1n << BigInt(i));
  }
  return result;
}

function _stringHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0;
  }
  return hash;
}

function hammingDistance(a, b) {
  let xor = a ^ b;
  let distance = 0;
  while (xor > 0n) {
    distance++;
    xor &= xor - 1n;
  }
  return distance;
}

// ==================== 内存缓存 ====================

const memoryStore = new Map();
const simHashIndex = new Map(); // simHash hex → [{ key, result, timestamp }]

function pruneMemoryStore() {
  const now = Date.now();
  for (const [key, entry] of memoryStore) {
    if (now - entry.timestamp > config.ttlMs) memoryStore.delete(key);
  }
  if (memoryStore.size > config.maxSize) {
    const entries = [...memoryStore.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toDelete = entries.slice(0, entries.length - config.maxSize);
    for (const [key] of toDelete) memoryStore.delete(key);
  }
}

// ==================== 精确匹配缓存 ====================

function exactKey(modelId, input) {
  const inputStr = typeof input === 'string' ? input : JSON.stringify(input);
  const hash = crypto.createHash('md5').update(`${modelId}:${inputStr}`).digest('hex');
  return `cache:exact:${hash}`;
}

export async function getExact(modelId, input) {
  const key = exactKey(modelId, input);

  // Redis
  if (config.backend === 'redis') {
    const redis = await getRedis();
    if (redis) {
      try {
        const raw = await redis.get(key);
        if (raw) return JSON.parse(raw);
      } catch (e) { logger.warn(`[SemanticCache] Redis get error: ${e.message}`); }
    }
  }

  // 内存
  const entry = memoryStore.get(key);
  if (entry && Date.now() - entry.timestamp < config.ttlMs) {
    pruneMemoryStore();
    return entry.result;
  }
  return null;
}

export async function setExact(modelId, input, result) {
  const key = exactKey(modelId, input);

  // Redis
  if (config.backend === 'redis') {
    const redis = await getRedis();
    if (redis) {
      try {
        await redis.setex(key, Math.ceil(config.ttlMs / 1000), JSON.stringify(result));
      } catch (e) { logger.warn(`[SemanticCache] Redis set error: ${e.message}`); }
    }
  }

  // 内存
  memoryStore.set(key, { result, timestamp: Date.now() });
  pruneMemoryStore();
}

// ==================== 语义相似度缓存 ====================

export async function getSemantic(modelId, textInput) {
  if (!config.semanticEnabled || typeof textInput !== 'string') return null;
  if (textInput.length < 50) return null; // 太短不缓存

  const hash = simHash(textInput);

  // Redis（存储 simHash → 结果映射）
  if (config.backend === 'redis') {
    const redis = await getRedis();
    if (redis) {
      try {
        const candidates = await redis.hgetall(`cache:simhash:${modelId}`);
        for (const [hexHash, raw] of Object.entries(candidates)) {
          const existingHash = BigInt('0x' + hexHash);
          if (hammingDistance(hash, existingHash) <= config.simHashThreshold) {
            return JSON.parse(raw);
          }
        }
      } catch (e) { logger.warn(`[SemanticCache] Redis simhash error: ${e.message}`); }
    }
  }

  // 内存
  const indexKey = `${modelId}:${hash.toString(16)}`;
  const candidates = simHashIndex.get(indexKey) || [];
  if (candidates.length > 0) {
    for (const entry of candidates) {
      if (hammingDistance(hash, entry.simHash || 0n) <= config.simHashThreshold) {
        return entry.result;
      }
    }
  }

  return null;
}

export async function setSemantic(modelId, textInput, result) {
  if (!config.semanticEnabled || typeof textInput !== 'string') return;
  if (textInput.length < 50) return;

  const hash = simHash(textInput);

  // Redis
  if (config.backend === 'redis') {
    const redis = await getRedis();
    if (redis) {
      try {
        await redis.hset(
          `cache:simhash:${modelId}`,
          hash.toString(16),
          JSON.stringify(result),
        );
        await redis.expire(`cache:simhash:${modelId}`, Math.ceil(config.ttlMs / 1000));
      } catch (e) { logger.warn(`[SemanticCache] Redis simhash set error: ${e.message}`); }
    }
  }

  // 内存
  const indexKey = `${modelId}:${hash.toString(16)}`;
  if (!simHashIndex.has(indexKey)) {
    simHashIndex.set(indexKey, []);
  }
  simHashIndex.get(indexKey).push({ simHash: hash, result, timestamp: Date.now() });
}

// ==================== 缓存统计 ====================

let cacheStats = { hits: 0, misses: 0, semanticHits: 0 };

export function recordHit(semantic = false) {
  cacheStats.hits++;
  if (semantic) cacheStats.semanticHits++;
}

export function recordMiss() {
  cacheStats.misses++;
}

export function getCacheStats() {
  const total = cacheStats.hits + cacheStats.misses || 1;
  return {
    ...cacheStats,
    hitRate: (cacheStats.hits / total * 100).toFixed(1) + '%',
    semanticHitRate: (cacheStats.semanticHits / total * 100).toFixed(1) + '%',
  };
}

export default { getExact, setExact, getSemantic, setSemantic, recordHit, recordMiss, getCacheStats };
