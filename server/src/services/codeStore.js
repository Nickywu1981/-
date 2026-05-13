/**
 * Redis-backed verification code store
 * 替换 in-process Map，支持 PM2 cluster 多进程共享
 * Phase 2 fix: verifyCode 使用 Lua 脚本消除 GET→modify→SET 竞态
 */
import { cacheSet, cacheDel, getRedis } from '../dao/redis.js';
import logger from '../utils/logger.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';

const CODE_PREFIX = 'vcode:';

export async function saveCode(key, code, ttlSeconds = 300) {
  try {
    await cacheSet(CODE_PREFIX + key, JSON.stringify({ code, attempts: 0 }), ttlSeconds);
    return true;
  } catch (e) {
    logger.warn('[CodeStore] Redis 写入失败，降级不可用', { key, error: e.message });
    return false;
  }
}

// Lua: 原子验证码校验 → 消除 attempts 计数器和 code 比较之间的 TOCTOU 窗口
const VERIFY_LUA = `
local key = KEYS[1]
local inputCode = ARGV[1]
local maxAttempts = tonumber(ARGV[2])
local raw = redis.call('GET', key)
if not raw then return {0, 'not_found'} end
local stored = cjson.decode(raw)
if stored.attempts >= maxAttempts then
  redis.call('DEL', key)
  return {0, 'max_attempts'}
end
if tostring(stored.code) ~= tostring(inputCode) then
  stored.attempts = stored.attempts + 1
  redis.call('SET', key, cjson.encode(stored), 'EX', 300)
  return {0, 'mismatch'}
end
redis.call('DEL', key)
return {1, 'valid'}
`;

export async function verifyCode(key, inputCode, maxAttempts = 5) {
  try {
    const r = await getRedis();
    if (r && r.isReady) {
      const result = await r.eval(VERIFY_LUA, { keys: [CODE_PREFIX + key], arguments: [String(inputCode), String(maxAttempts)] });
      if (result[0] === 1) return { valid: true };
      return { valid: false, reason: result[1] };
    }
    // Redis 不可用：回退到进程内无竞态保护逻辑（单进程安全）
    throw new BusinessError(ERROR_CODE.INTERNAL_ERROR, 'Redis not ready');
  } catch (e) {
    logger.warn('[CodeStore] Redis 读取失败', { key, error: e.message });
    return { valid: false, reason: 'error' };
  }
}
