/**
 * Redis-backed verification code store
 * 替换 in-process Map，支持 PM2 cluster 多进程共享
 */
import { cacheGet, cacheSet, cacheDel } from '../dao/redis.js';
import logger from '../utils/logger.js';

const CODE_PREFIX = 'vcode:';
const RATE_PREFIX = 'vrate:';

export async function saveCode(key, code, ttlSeconds = 300) {
  try {
    await cacheSet(CODE_PREFIX + key, JSON.stringify({ code, attempts: 0 }), ttlSeconds);
    return true;
  } catch (e) {
    logger.warn('[CodeStore] Redis 写入失败，降级不可用', { key, error: e.message });
    return false;
  }
}

export async function verifyCode(key, inputCode, maxAttempts = 5) {
  try {
    const raw = await cacheGet(CODE_PREFIX + key);
    if (!raw) return { valid: false, reason: 'not_found' };

    const stored = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (stored.attempts >= maxAttempts) {
      await cacheDel(CODE_PREFIX + key);
      return { valid: false, reason: 'max_attempts' };
    }

    if (String(stored.code) !== String(inputCode)) {
      stored.attempts++;
      try { await cacheSet(CODE_PREFIX + key, JSON.stringify(stored), 300); } catch { /* ignore */ }
      return { valid: false, reason: 'mismatch' };
    }

    await cacheDel(CODE_PREFIX + key);
    return { valid: true };
  } catch (e) {
    logger.warn('[CodeStore] Redis 读取失败', { key, error: e.message });
    return { valid: false, reason: 'error' };
  }
}

export async function checkRateLimit(key, maxPerHour = 5, maxPerDay = 10) {
  try {
    const raw = await cacheGet(RATE_PREFIX + key);
    const log = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : { timestamps: [] };
    const now = Date.now();
    log.timestamps = log.timestamps.filter(t => now - t < 86400000);
    const hourCount = log.timestamps.filter(t => now - t < 3600000).length;

    if (hourCount >= maxPerHour) return { allowed: false, reason: 'hourly_limit' };
    if (log.timestamps.length >= maxPerDay) return { allowed: false, reason: 'daily_limit' };

    log.timestamps.push(now);
    try { await cacheSet(RATE_PREFIX + key, JSON.stringify(log), 86400); } catch { /* ignore */ }
    return { allowed: true };
  } catch (e) {
    logger.warn('[CodeStore] Redis rate check failed', { key, error: e.message });
    return { allowed: true }; // 降级放行
  }
}
