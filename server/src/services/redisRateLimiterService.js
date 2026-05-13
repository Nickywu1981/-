/**
 * Redis 分布式限流服务 — Token Bucket 实现
 *
 * 支持维度: user / ip / app
 * 后端: Redis (生产) 或 内存 (开发)
 * 算法: Token Bucket（令牌桶）
 */
import logger from '../utils/logger.js';
import { aiGatewayConfig } from '../config/index.js';

const config = aiGatewayConfig.rateLimiter;

// ==================== Redis 客户端（惰性初始化） ====================

let _redis = null;
let _redisInitAttempted = false;

async function getRedis() {
  if (_redis) return _redis;
  if (_redisInitAttempted) return null;
  try {
    const { default: redisModule } = await import('../dao/redis.js');
    _redis = redisModule;
  } catch {
    logger.warn('[RedisRateLimiter] Redis 不可用，降级为内存模式');
  }
  _redisInitAttempted = true;
  return _redis;
}

// ==================== 内存 Token Bucket ====================

const memoryBuckets = new Map();

class MemoryTokenBucket {
  constructor(qps, burst) {
    this.qps = qps;
    this.burst = burst;
    this.tokens = burst;
    this.lastRefill = Date.now();
  }

  tryConsume(count = 1) {
    this._refill();
    if (this.tokens >= count) {
      this.tokens -= count;
      return { allowed: true, remaining: this.tokens, reset: 0 };
    }
    return { allowed: false, remaining: this.tokens, reset: Math.ceil((count - this.tokens) / this.qps * 1000) };
  }

  _refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.burst, this.tokens + elapsed * this.qps);
    this.lastRefill = now;
  }
}

function getMemoryBucket(key, qps, burst) {
  if (!memoryBuckets.has(key)) {
    memoryBuckets.set(key, new MemoryTokenBucket(qps, burst));
  }
  return memoryBuckets.get(key);
}

// 定期清理过期 Bucket
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of memoryBuckets) {
    if (now - bucket.lastRefill > 5 * 60 * 1000) memoryBuckets.delete(key);
  }
}, 60000).unref();

// ==================== Redis Token Bucket ====================

async function redisTryConsume(key, qps, burst, count = 1) {
  const redis = await getRedis();
  if (!redis) {
    // 降级为内存模式
    const bucket = getMemoryBucket(key, qps, burst);
    return bucket.tryConsume(count);
  }

  const now = Date.now();
  const bucketKey = `ratelimit:${key}`;

  try {
    // Lua 脚本实现原子 Token Bucket
    const lua = `
      local key = KEYS[1]
      local qps = tonumber(ARGV[1])
      local burst = tonumber(ARGV[2])
      local count = tonumber(ARGV[3])
      local now = tonumber(ARGV[4])

      local data = redis.call('HMGET', key, 'tokens', 'last_refill')
      local tokens = tonumber(data[1]) or burst
      local lastRefill = tonumber(data[2]) or now

      -- Refill
      local elapsed = (now - lastRefill) / 1000
      tokens = math.min(burst, tokens + elapsed * qps)

      if tokens >= count then
        tokens = tokens - count
        redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
        redis.call('EXPIRE', key, math.ceil(burst / qps) + 10)
        return {1, math.floor(tokens), 0}
      else
        local waitMs = math.ceil((count - tokens) / qps * 1000)
        redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
        redis.call('EXPIRE', key, math.ceil(burst / qps) + 10)
        return {0, math.floor(tokens), waitMs}
      end
    `;

    const result = await redis.eval(lua, 1, bucketKey, qps, burst, count, now);

    return {
      allowed: result[0] === 1,
      remaining: result[1],
      reset: result[2],
    };
  } catch (e) {
    logger.warn(`[RedisRateLimiter] Redis 异常: ${e.message}, 降级通过`);
    return { allowed: true, remaining: 0, reset: 0 };
  }
}

// ==================== 多维度入口 ====================

/**
 * @param {'user'|'ip'|'app'} dimension
 * @param {string} id
 * @param {number} [count=1]
 * @returns {{ allowed: boolean, remaining: number, reset: number }}
 */
export async function tryConsume(dimension, id, count = 1) {
  if (!id) return { allowed: true, remaining: 0, reset: 0 };

  let qps, burst;

  switch (dimension) {
    case 'user':
      qps = config.userQPS;
      burst = config.userBurst;
      break;
    case 'ip':
      qps = config.ipQPS;
      burst = config.ipBurst;
      break;
    case 'app':
      qps = config.appQPS;
      burst = config.appBurst;
      break;
    default:
      return { allowed: true, remaining: 0, reset: 0 };
  }

  const key = `ai:${dimension}:${id}`;

  if (config.backend === 'redis') {
    return redisTryConsume(key, qps, burst, count);
  }

  const bucket = getMemoryBucket(key, qps, burst);
  return bucket.tryConsume(count);
}

/**
 * 联合检查：同时检查 user + ip + app 维度
 */
export async function multiCheck(userId, ip, appId) {
  const results = await Promise.all([
    tryConsume('user', userId),
    tryConsume('ip', ip),
    appId ? tryConsume('app', appId) : { allowed: true, remaining: 0, reset: 0 },
  ]);

  const [userR, ipR, appR] = results;
  const allowed = userR.allowed && ipR.allowed && appR.allowed;
  const blockedReasons = [];

  if (!userR.allowed) blockedReasons.push(`用户配额不足 (剩余: ${userR.remaining})`);
  if (!ipR.allowed) blockedReasons.push(`IP 配额不足 (剩余: ${ipR.remaining})`);
  if (!appR.allowed) blockedReasons.push(`应用配额不足 (剩余: ${appR.remaining})`);

  return {
    allowed,
    blockedReasons,
    remaining: Math.min(userR.remaining, ipR.remaining, appR.remaining),
    details: { user: userR, ip: ipR, app: appR },
  };
}

export default { tryConsume, multiCheck };
