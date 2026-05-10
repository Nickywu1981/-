import rateLimit from 'express-rate-limit';
import { error } from '../utils/response.js';

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000;
const max = parseInt(process.env.RATE_LIMIT_MAX, 10) || 200;

// ==================== 并发控制 ====================

const CONCURRENCY_MAX_PER_USER = 6;
const CONCURRENCY_AI_PER_USER = 3;
const userConcurrency = new Map();

// 每 30 分钟清理一次超时条目（防止 socket hang-up 导致泄漏）
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
  const ip = req.ip || req.connection?.remoteAddress || '0.0.0.0';
  return req.user?.id || ip.replace(/^::ffff:/, '');
}

export function concurrencyGuard(maxConcurrent = CONCURRENCY_MAX_PER_USER) {
  return (req, res, next) => {
    const key = getConcurrencyKey(req);
    const entry = userConcurrency.get(key) || { count: 0, ts: Date.now() };
    if (entry.count >= maxConcurrent) {
      return error(res, 429, `并发请求过多 (${maxConcurrent}路)，请稍后再试`);
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
  message: { code: 429, msg: '请求过于频繁，请稍后再试', data: null },
});

/** 登录/注册严格限流 */
export const authLimiter = rateLimit({
  windowMs: 60000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 429, msg: '操作过于频繁，请1分钟后再试', data: null },
});

/** 发送验证码严格限流（防短信轰炸） */
export const codeLimiter = rateLimit({
  windowMs: 60000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 429, msg: '验证码已发送，请60秒后再试', data: null },
});

/** AI 重度操作限流（图片/视频/批量生成消耗 GPU） */
export const heavyLimiter = rateLimit({
  windowMs: 60000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 429, msg: 'AI生成请求过于频繁，请稍后再试', data: null },
});

/** 上传限流 */
export const uploadLimiter = rateLimit({
  windowMs: 60000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 429, msg: '上传请求过于频繁，请稍后再试', data: null },
});

/** 支付/充值限流（财务敏感） */
export const paymentLimiter = rateLimit({
  windowMs: 60000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 429, msg: '支付请求过于频繁，请稍后再试', data: null },
});

/** 管理后台限流 */
export const adminLimiter = rateLimit({
  windowMs: 60000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 429, msg: '管理操作过于频繁，请稍后再试', data: null },
});
