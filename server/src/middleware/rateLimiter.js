import rateLimit from 'express-rate-limit';

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000;
const max = parseInt(process.env.RATE_LIMIT_MAX, 10) || 200;

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
