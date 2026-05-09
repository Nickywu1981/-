/**
 * Movio AI v4.1 — Auth Middleware
 * JWT 鉴权 + Redis 黑名单校验 + 多租户注入 + Token 自动续期
 *
 * Phase 1 P0 修复：黑名单校验 + tenantId 注入 (2026-05-08)
 */
import jwt from 'jsonwebtoken';
import { error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { isTokenBlacklisted } from '../utils/jwtToken.js';
import { jwtSecret as JWT_SECRET } from '../config/index.js';

const JWT_REFRESH_WINDOW = 7 * 24 * 60 * 60; // seconds — cookie maxAge needs numeric
const RENEW_WINDOW = 24 * 60 * 60;

export async function authMiddleware(req, res, next) {
  // 公开路由白名单（精确匹配）
  const publicPaths = [
    '/api/health', '/api/metrics',
    '/api/auth/register', '/api/auth/login', '/api/auth/login-by-code', '/api/auth/reset-password',
    '/api/users/register', '/api/users/login', '/api/users/forgot-password', '/api/users/reset-password',
    '/api/site-config/public', '/api/config/version/stream',
    '/api/templates/platforms', '/api/payment/plans',
    '/api/multilingual/languages', '/api/multilingual/script-types',
    '/api/compliance/rules', '/api/compliance/targets', '/api/badges',
    '/api/sms/send-code', '/api/sms/verify-code',
    '/api/email/send-code', '/api/email/verify-code',
    '/api/payment/notify', '/api/allinpay/notify',
    '/api/ai-dispatch/health', '/api/ai-dispatch/categories',
    '/api/internal/embed',
    '/api/diy/published',
  ];

  // 文档路径前缀匹配 (Swagger UI 子资源)
  if (req.path.startsWith('/api/docs')) return next();

  if (publicPaths.includes(req.path)) return next();

  if (req.method === 'GET' && req.path.startsWith('/api/config/') && !req.path.startsWith('/api/admin/config')) {
    return next();
  }

  // DIY published pages are public (GET /api/diy/published/:slug)
  if (req.method === 'GET' && req.path.startsWith('/api/diy/published/')) {
    return next();
  }

  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return error(res, ERROR_CODE.UNAUTHORIZED, '请先登录', 401);
  }

  // P0-2 修复：JWT 黑名单校验
  try {
    if (await isTokenBlacklisted(token)) {
      res.clearCookie('token');
      return error(res, ERROR_CODE.UNAUTHORIZED, '令牌已被吊销，请重新登录', 401);
    }
  } catch {
    // Redis 离线时跳过黑名单校验，降级安全模式
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.userId || payload.id, role: payload.role, nickname: payload.nickname };
    req.userId = payload.userId || payload.id;  // 兼容旧代码直接引用 req.userId
    // P0-1 修复：从 JWT payload 注入 tenantId，多租户数据隔离
    req.tenantId = payload.tenantId || 0;

    const timeToExpire = payload.exp - Math.floor(Date.now() / 1000);
    if (timeToExpire > 0 && timeToExpire < RENEW_WINDOW) {
      const newToken = jwt.sign(
        { userId: payload.userId || payload.id, role: payload.role, nickname: payload.nickname, tenantId: payload.tenantId },
        JWT_SECRET,
        { expiresIn: JWT_REFRESH_WINDOW },
      );
      res.cookie('token', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: JWT_REFRESH_WINDOW * 1000,
      });
    }

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      res.clearCookie('token');
      return error(res, ERROR_CODE.UNAUTHORIZED, '登录已过期，请重新登录', 401);
    }
    return error(res, ERROR_CODE.UNAUTHORIZED, '无效的认证信息', 401);
  }
}
