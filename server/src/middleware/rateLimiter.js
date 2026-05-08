import rateLimit from 'express-rate-limit';

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000;
const max = parseInt(process.env.RATE_LIMIT_MAX, 10) || 200;

// ==================== 并发控制 ====================

const CONCURRENCY_MAX_PER_USER = 6;
const CONCURRENCY_AI_PER_USER = 3;
const userConcurrency = new Map();

function getConcurrencyKey(req) {
  return req.user?.id || req.ip.replace(/^::ffff:/, '');
}

export function concurrencyGuard(maxConcurrent = CONCURRENCY_MAX_PER_USER) {
  return (req, res, next) => {
    const key = getConcurrencyKey(req);
    const current = userConcurrency.get(key) || 0;
    if (current >= maxConcurrent) {
      return res.status(429).json({ code: 429, msg: `并发请求过多 (${maxConcurrent}路)，请稍后再试`, data: null });
    }
    userConcurrency.set(key, current + 1);
    res.on('finish', () => {
      const c = userConcurrency.get(key) || 1;
      if (c <= 1) userConcurrency.delete(key);
      else userConcurrency.set(key, c - 1);
    });
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
