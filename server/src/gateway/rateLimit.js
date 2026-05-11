/**
 * Gateway — 统一限流配置注册表
 *
 * @deprecated 本文件与 middleware/rateLimiter.js 完全重复。
 * 实际运行时 app.js 使用 middleware/rateLimiter.js 的实例。
 * 本文件限流器实例+并发守卫+RATE_LIMITER_REGISTRY 均未接入请求链路。
 * 请使用 middleware/rateLimiter.js，本文件待后续去重合并。
 *
 * 集中管理全部限流器定义，供 routeRegistry 和 app.js 引用。
 * 从 middleware/rateLimiter.js 提取，保持原有导出兼容。
 */
import rateLimit from 'express-rate-limit';

// ==================== 配置常量 ====================

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000;
const max = parseInt(process.env.RATE_LIMIT_MAX, 10) || 200;

const AUTH_MAX = parseInt(process.env.RATE_LIMIT_AUTH_MAX, 10) || 10;
const CODE_MAX = parseInt(process.env.RATE_LIMIT_CODE_MAX, 10) || 1;
const HEAVY_MAX = parseInt(process.env.RATE_LIMIT_HEAVY_MAX, 10) || 30;
const UPLOAD_MAX = parseInt(process.env.RATE_LIMIT_UPLOAD_MAX, 10) || 20;
const PAYMENT_MAX = parseInt(process.env.RATE_LIMIT_PAYMENT_MAX, 10) || 15;
const ADMIN_MAX = parseInt(process.env.RATE_LIMIT_ADMIN_MAX, 10) || 60;

// ==================== 并发控制 ====================

const CONCURRENCY_MAX_PER_USER = parseInt(process.env.RATE_LIMIT_CONCURRENCY_MAX, 10) || 6;
const CONCURRENCY_AI_PER_USER = parseInt(process.env.RATE_LIMIT_AI_CONCURRENCY_MAX, 10) || 3;
const userConcurrency = new Map();

const CONCURRENCY_TTL_MS = 30 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of userConcurrency) {
    if (now - entry.ts > CONCURRENCY_TTL_MS) {
      userConcurrency.delete(key);
    }
  }
}, CONCURRENCY_TTL_MS).unref();

function getConcurrencyKey(req) {
  const ip = req.ip || req.connection?.remoteAddress;
  if (!ip) return `anon_${Math.random().toString(36).slice(2, 8)}`;
  return req.user?.id || ip.replace(/^::ffff:/, '');
}

export function concurrencyGuard(maxConcurrent = CONCURRENCY_MAX_PER_USER) {
  return (req, res, next) => {
    const key = getConcurrencyKey(req);
    const entry = userConcurrency.get(key) || { count: 0, ts: Date.now() };
    if (entry.count >= maxConcurrent) {
      return res.status(429).json({ code: 429, msg: `并发请求过多 (${maxConcurrent}路)，请稍后再试`, data: null });
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

export const aiConcurrencyGuard = concurrencyGuard(CONCURRENCY_AI_PER_USER);

// ==================== 频率限流器 ====================

export const apiLimiter = rateLimit({
  windowMs, max,
  standardHeaders: true, legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { code: 429, msg: '请求过于频繁，请稍后再试', data: null },
});

export const authLimiter = rateLimit({
  windowMs: 60000, max: AUTH_MAX,
  standardHeaders: true, legacyHeaders: false,
  message: { code: 429, msg: '操作过于频繁，请1分钟后再试', data: null },
});

export const codeLimiter = rateLimit({
  windowMs: 60000, max: CODE_MAX,
  standardHeaders: true, legacyHeaders: false,
  message: { code: 429, msg: '验证码已发送，请60秒后再试', data: null },
});

const verifyMax = parseInt(process.env.RATE_LIMIT_VERIFY_MAX, 10) || 5;

export const verifyLimiter = rateLimit({
  windowMs: 60000, max: verifyMax,
  standardHeaders: true, legacyHeaders: false,
  message: { code: 429, msg: '验证次数过多，请60秒后再试', data: null },
});

export const heavyLimiter = rateLimit({
  windowMs: 60000, max: HEAVY_MAX,
  standardHeaders: true, legacyHeaders: false,
  message: { code: 429, msg: 'AI生成请求过于频繁，请稍后再试', data: null },
});

export const uploadLimiter = rateLimit({
  windowMs: 60000, max: UPLOAD_MAX,
  standardHeaders: true, legacyHeaders: false,
  message: { code: 429, msg: '上传请求过于频繁，请稍后再试', data: null },
});

export const paymentLimiter = rateLimit({
  windowMs: 60000, max: PAYMENT_MAX,
  standardHeaders: true, legacyHeaders: false,
  message: { code: 429, msg: '支付请求过于频繁，请稍后再试', data: null },
});

export const adminLimiter = rateLimit({
  windowMs: 60000, max: ADMIN_MAX,
  standardHeaders: true, legacyHeaders: false,
  message: { code: 429, msg: '管理操作过于频繁，请稍后再试', data: null },
});

// ==================== 限流器注册表 ====================

/**
 * 限流器元数据注册表 — 供路由注册和监控面板使用
 * @type {Record<string, { limiter: Function, tier: string, description: string }>}
 */
export const RATE_LIMITER_REGISTRY = {
  apiLimiter:    { limiter: apiLimiter,    tier: 'global',  description: '全局API限流 (200/min)' },
  authLimiter:   { limiter: authLimiter,   tier: 'strict',  description: '认证限流 (10/min)' },
  codeLimiter:   { limiter: codeLimiter,   tier: 'strict',  description: '验证码限流 (1/min)' },
  verifyLimiter: { limiter: verifyLimiter, tier: 'normal',  description: '验证校验限流 (5/min)' },
  heavyLimiter:  { limiter: heavyLimiter,  tier: 'heavy',   description: 'AI生成限流 (30/min)' },
  uploadLimiter: { limiter: uploadLimiter, tier: 'normal',  description: '上传限流 (20/min)' },
  paymentLimiter:{ limiter: paymentLimiter,tier: 'strict',  description: '支付限流 (15/min)' },
  adminLimiter:  { limiter: adminLimiter,  tier: 'admin',   description: '管理后台限流 (60/min)' },
  aiConcurrencyGuard: { limiter: aiConcurrencyGuard, tier: 'heavy', description: 'AI并发控制 (3路)' },
};

/**
 * 获取限流器注册表摘要（供健康仪表盘）
 */
export function getRateLimiterSummary() {
  return Object.entries(RATE_LIMITER_REGISTRY).map(([name, { tier, description }]) => ({
    name, tier, description,
  }));
}
