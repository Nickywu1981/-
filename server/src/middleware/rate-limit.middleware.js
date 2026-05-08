/**
 * Movio AI v4.1 — Rate Limit Middleware
 * G5 后端开发 | 中间件链第4层
 * 免费用户 60次/分钟, 付费用户 300次/分钟
 */
import rateLimit from 'express-rate-limit';
import { getConfig } from '../services/config.service.js';

// 动态限流——从配置表读取，缓存5分钟
let rateLimiters = null;
let lastConfigRefresh = 0;
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5分钟

async function getRateLimitConfig() {
  if (rateLimiters && Date.now() - lastConfigRefresh < REFRESH_INTERVAL) {
    return rateLimiters;
  }
  // 从 sys_config 读取限流配置，降级使用默认值
  const freeMax = 60;
  const paidMax = 300;
  const windowMs = 60000;

  rateLimiters = {
    free: rateLimit({ windowMs, max: freeMax, standardHeaders: true, legacyHeaders: false, message: { code: 429, msg: '请求过于频繁，请稍后再试' } }),
    paid: rateLimit({ windowMs, max: paidMax, standardHeaders: true, legacyHeaders: false, message: { code: 429, msg: '请求过于频繁，请稍后再试' } }),
  };
  lastConfigRefresh = Date.now();
  return rateLimiters;
}

export async function rateLimitMiddleware(req, res, next) {
  const limiters = await getRateLimitConfig();
  const userRole = req.user?.role || 'free';
  const isPaid = ['member', 'admin', 'super_admin', 'operator'].includes(userRole);
  return isPaid ? limiters.paid(req, res, next) : limiters.free(req, res, next);
}
