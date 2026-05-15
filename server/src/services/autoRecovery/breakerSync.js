/**
 * 断路器同步 — Redis 跨进程共享 + 自愈 reset
 * 提取自 autoRecoveryService.js
 */
import logger from '../../utils/logger.js';
import { cacheGet, cacheSet } from '../../dao/redis.js';

const BREAKER_REDIS_PREFIX = 'breaker:state:';
const BREAKER_REDIS_TTL = 90;

// 断路器自愈 — reset 过期断路器
export async function healBreakers(metrics) {
  try {
    const { modelBreakers } = await import('../../gateway/gatewayCore.js');
    if (!modelBreakers || modelBreakers.size === 0) return;

    for (const [modelId, breaker] of modelBreakers) {
      const stats = breaker.getStats();
      if (stats.state === 'open' && stats.cooldownRemaining <= 0) {
        breaker.reset();
        metrics.breakerResets++;
        logger.info('[AutoRecovery] Breaker reset → half-open', { modelId });
      }
    }
  } catch (e) {
    logger.warn('[AutoRecovery] Breaker heal failed', { error: e.message });
  }
}

// Redis 共享 — 同步断路器状态到 Redis
export async function syncToRedis() {
  try {
    const { modelBreakers } = await import('../../gateway/gatewayCore.js');
    if (!modelBreakers || modelBreakers.size === 0) return;

    for (const [modelId, breaker] of modelBreakers) {
      const stats = breaker.getStats();
      const key = BREAKER_REDIS_PREFIX + modelId;
      try {
        await cacheSet(key, { state: stats.state, errorRate: stats.errorRate, updatedAt: Date.now() }, BREAKER_REDIS_TTL);
      } catch (e) { logger.warn('[AutoRecovery] Redis set failed', { modelId, error: e.message }); }
    }
  } catch (e) { logger.warn('[AutoRecovery] Breaker sync to Redis failed', { error: e.message }); }
}

// Redis 恢复 — 从 Redis 加载断路器状态
export async function loadFromRedis() {
  try {
    const { modelBreakers } = await import('../../gateway/gatewayCore.js');
    if (!modelBreakers) return;

    for (const [modelId, breaker] of modelBreakers) {
      const key = BREAKER_REDIS_PREFIX + modelId;
      try {
        const remote = await cacheGet(key);
        if (remote && remote.state === 'open' && breaker.getState() !== 'open') {
          breaker.recordFailure();
          logger.info('[AutoRecovery] Breaker state synced from Redis', { modelId, remoteState: remote.state });
        }
      } catch (e) { logger.warn('[AutoRecovery] Redis get failed', { modelId, error: e.message }); }
    }
  } catch (e) { logger.warn('[AutoRecovery] Breaker sync from Redis failed', { error: e.message }); }
}
