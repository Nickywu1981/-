/**
 * Movio AI — Rate Limiter Middleware
 *
 * 统一限流器定义，被 app.js 及所有路由文件引用。
 * v4.2: 增加多维度令牌桶限流 (AI 专用)
 */
import rateLimit from 'express-rate-limit';
import { error } from '../utils/response.js';
import { rateLimitConfig } from '../config/index.js';
import { registerTimer } from '../utils/shutdownRegistry.js';
import logger from '../utils/logger.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { RedisRateLimitStore } from './redisRateLimitStore.js';

// Redis 不可用时内存回退限流存储
const memoryFallbackStore = {};

const windowMs = rateLimitConfig.windowMs;
const max = rateLimitConfig.max;

// Per-limiter max overrides from config
const AUTH_MAX = rateLimitConfig.authMax;
const CODE_MAX = rateLimitConfig.codeMax;
const HEAVY_MAX = rateLimitConfig.heavyMax;
const UPLOAD_MAX = rateLimitConfig.uploadMax;
const PAYMENT_MAX = rateLimitConfig.paymentMax;
const ADMIN_MAX = rateLimitConfig.adminMax;
const E2B_MAX = rateLimitConfig.e2bMax;
const E2B_EXECUTE_MAX = rateLimitConfig.e2bExecuteMax;
const E2B_READ_MAX = rateLimitConfig.e2bReadMax;
const E2B_DELETE_MAX = rateLimitConfig.e2bDeleteMax;

// ==================== 并发控制 ====================

const CONCURRENCY_MAX_PER_USER = rateLimitConfig.concurrencyMax;
const CONCURRENCY_AI_PER_USER = rateLimitConfig.aiConcurrencyMax;
const userConcurrency = new Map();

// 每 30 分钟清理一次超时条目（防止 socket hang-up 导致泄漏）
const CONCURRENCY_TTL_MS = 30 * 60 * 1000;
export const _concurrencyCleanupTimer = setInterval(() => {
  try {
  const now = Date.now();
  for (const [key, entry] of userConcurrency) {
    if (now - entry.ts > CONCURRENCY_TTL_MS) {
      userConcurrency.delete(key);
    }
  }
  } catch { /* Map 迭代安全，兜底防护 */ }
}, CONCURRENCY_TTL_MS).unref();
registerTimer(_concurrencyCleanupTimer);
function getConcurrencyKey(req) {
  const ip = req.ip || req.connection?.remoteAddress;
  if (!ip) return `anon_${Math.random().toString(36).slice(2, 8)}`;
  return req.user?.id || ip.replace(/^::ffff:/, '');
}

function concurrencyGuard(maxConcurrent = CONCURRENCY_MAX_PER_USER) {
  return (req, res, next) => {
    const key = getConcurrencyKey(req);
    const entry = userConcurrency.get(key) || { count: 0, ts: Date.now() };
    if (entry.count >= maxConcurrent) {
      return error(res, ERROR_CODE.EC_RATE_CONCURRENCY);
    }
    entry.count++;
    entry.ts = Date.now();
    userConcurrency.set(key, entry);

    let decremented = false;
    const decrement = () => {
      if (decremented) return;
      decremented = true;
      const cur = userConcurrency.get(key);
      if (!cur) return;
      if (cur.count <= 1) userConcurrency.delete(key);
      else { cur.count--; cur.ts = Date.now(); }
    };
    res.on('finish', decrement);
    res.on('close', decrement);
    next();
  };
}

/** AI 操作专用并发保护 */
export const aiConcurrencyGuard = concurrencyGuard(CONCURRENCY_AI_PER_USER);

// ==================== 频率限流 ====================

/** 全局 API 限流 */
export const apiLimiter = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  store: new RedisRateLimitStore(windowMs),
  skip: (req) => req.path === '/healthz' || req.path === '/readyz' || req.path === '/api/health',
  message: { code: ERROR_CODE.EC_RATE_GENERAL, msg: '', data: null },
});

/** 登录/注册严格限流 */
export const authLimiter = rateLimit({
  windowMs: 60000,
  max: AUTH_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  store: new RedisRateLimitStore(60000),
  message: { code: ERROR_CODE.EC_RATE_AUTH, msg: '', data: null },
});

/** 发送验证码严格限流（防短信轰炸） */
export const codeLimiter = rateLimit({
  windowMs: 60000,
  max: CODE_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  store: new RedisRateLimitStore(60000),
  message: { code: ERROR_CODE.EC_RATE_CODE, msg: '', data: null },
});

const verifyMax = rateLimitConfig.verifyMax;

/** 验证码校验限流（比发送宽松，允许用户多次尝试验证码） */
export const verifyLimiter = rateLimit({
  windowMs: 60000,
  max: verifyMax,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  store: new RedisRateLimitStore(60000),
  message: { code: ERROR_CODE.EC_RATE_VERIFY, msg: '', data: null },
});

/** AI 重度操作限流（图片/视频/批量生成消耗 GPU） */
export const heavyLimiter = rateLimit({
  windowMs: 60000,
  max: HEAVY_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  store: new RedisRateLimitStore(60000),
  message: { code: ERROR_CODE.EC_RATE_HEAVY, msg: '', data: null },
});

/** 上传限流 */
export const uploadLimiter = rateLimit({
  windowMs: 60000,
  max: UPLOAD_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  store: new RedisRateLimitStore(60000),
  message: { code: ERROR_CODE.EC_RATE_UPLOAD, msg: '', data: null },
});

/** 支付/充值限流（财务敏感） */
export const paymentLimiter = rateLimit({
  windowMs: 60000,
  max: PAYMENT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  store: new RedisRateLimitStore(60000),
  message: { code: ERROR_CODE.EC_RATE_PAYMENT, msg: '', data: null },
});

/** 管理后台限流 */
export const adminLimiter = rateLimit({
  windowMs: 60000,
  max: ADMIN_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  store: new RedisRateLimitStore(60000),
  message: { code: ERROR_CODE.EC_RATE_ADMIN, msg: '', data: null },
});

/** E2B 沙箱限流 — 云执行环境创建属于昂贵操作 */
export const e2bLimiter = rateLimit({
  windowMs: 60000,
  max: E2B_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  store: new RedisRateLimitStore(60000),
  message: { code: ERROR_CODE.EC_RATE_E2B, msg: '', data: null },
});

/** E2B 代码执行限流 — 防止单沙箱高频调用耗尽配额 */
export const e2bExecuteLimiter = rateLimit({
  windowMs: 60000,
  max: E2B_EXECUTE_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  store: new RedisRateLimitStore(60000),
  message: { code: ERROR_CODE.EC_RATE_E2B_EXEC, msg: '', data: null },
});

/** E2B 沙箱读取限流 — 查询沙箱状态/列表 */
export const e2bListLimiter = rateLimit({
  windowMs: 60000,
  max: E2B_READ_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  store: new RedisRateLimitStore(60000),
  message: { code: ERROR_CODE.EC_RATE_E2B_READ, msg: '', data: null },
});

/** E2B 沙箱删除限流 — 销毁操作 */
export const e2bDestroyLimiter = rateLimit({
  windowMs: 60000,
  max: E2B_DELETE_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  store: new RedisRateLimitStore(60000),
  message: { code: ERROR_CODE.EC_RATE_E2B_DELETE, msg: '', data: null },
});

/** 通用限流器 —— 用于读密集型路由的通用保护 */
export const rateLimiter = apiLimiter;

// ==================== AI 多维度令牌桶限流（新增） ====================

/**
 * AI 专用多维度限流中间件
 * 同时检查 user / ip / app 三个维度的令牌桶
 * 返回 Header: X-RateLimit-Remaining, X-RateLimit-Reset
 */
export async function aiTokenBucketLimiter(req, res, next) {
  const userId = req.user?.id || null;
  const ip = req.ip || req.connection?.remoteAddress?.replace(/^::ffff:/, '') || 'unknown';
  const appId = req.headers['x-app-key'] || null;

  try {
    const { multiCheck } = await import('../services/redisRateLimiterService.js');
    const result = await multiCheck(userId, ip, appId);
    res.setHeader('X-RateLimit-Remaining', result.remaining);

    if (!result.allowed) {
      res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + 60);
      return error(res, ERROR_CODE.EC_RATE_HEAVY, '', { reasons: result.blockedReasons });
    }

    next();
  } catch (err) {
    logger.warn('[RateLimiter] TokenBucket check failed:', err.message);
    // Redis 不可用时回落内存严格限流（5次/分钟），避免 fail-open 被绕过
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const memoryKey = `rl:fallback:${ip}:${(options.prefix || '')}`;
    const now = Date.now();
    const entry = (memoryFallbackStore[memoryKey] || { count: 0, resetAt: now + 60000 });
    if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 60000; }
    entry.count++;
    memoryFallbackStore[memoryKey] = entry;
    if (entry.count > 5) {
      return error(res, ERROR_CODE.EC_RATE_HEAVY, '', { reasons: ['rate_limiter_fallback'] });
    }
    next();
  }
}
