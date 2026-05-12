/**
 * CSRF 双重提交 Cookie 模式
 *
 * 前端读取 csrf_token cookie，放入 X-CSRF-Token 请求头
 * 中间件比对 Cookie 和 Header 是否一致
 */

import crypto from 'crypto';
import { error as sendError } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { isProduction } from '../config/index.js';

// CSRF Token 有效期（30分钟）
const TOKEN_TTL = 30 * 60 * 1000;

/**
 * 生成 CSRF Token 并写入 Cookie
 * 应在登录成功 / 访问首页时调用
 */
export function setCsrfCookie(req, res, next) {
  // 复用已有有效 cookie，避免每次请求重新生成（crypto 开销）
  const existingToken = req.cookies?.csrf_token;
  if (existingToken && existingToken.length === 64) {
    req.csrfToken = existingToken;
    return next();
  }

  const token = crypto.randomBytes(32).toString('hex');
  req.csrfToken = token;

  res.cookie('csrf_token', token, {
    httpOnly: false,    // 前端需要能读取
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: TOKEN_TTL,
    path: '/',
  });

  next();
}

/**
 * CSRF 校验中间件 — 对所有 POST/PUT/PATCH/DELETE 请求
 * 比对 Cookie 中的 csrf_token 和 Header 中的 X-CSRF-Token
 */
export function csrfProtection(req, res, next) {
  // GET/HEAD/OPTIONS 不需要 CSRF 校验
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // 公开端点无需 CSRF：登录/注册/验证码/密码重置/支付回调
  // 同时覆盖 /api/ 前缀路径（前端直连）和去前缀路径（Nuxt devProxy 转发）
  const publicPaths = ['/api/users/login', '/api/users/register', '/api/users/forgot-password',
    '/api/auth/login', '/api/auth/register', '/api/auth/forgot-password', '/api/auth/login-by-code', '/api/auth/reset-password',
    '/auth/login', '/auth/register', '/auth/forgot-password', '/auth/login-by-code', '/auth/reset-password',
    '/users/login', '/users/register', '/users/forgot-password',
    '/api/email/send-code', '/api/email/verify-code',
    '/email/send-code', '/email/verify-code',
    '/api/site-config/public', '/site-config/public',
    '/api/health', '/api/metrics', '/health', '/metrics',
    '/api/ai-dispatch/health', '/api/ai-dispatch/categories',
    '/api/recharge/callback', '/api/payment/notify', '/recharge/callback', '/payment/notify',
    '/api/enterprise/register', '/api/enterprise/login',                  // Phase 1: B端注册/登录
    '/enterprise/register', '/enterprise/login'];                          // Phase 1: devProxy去前缀
  const isPublic = publicPaths.some(p => req.path === p || req.path.startsWith(p + '/'))
    || req.path.startsWith('/api/internal/')
    || req.path.startsWith('/internal/');
  if (isPublic) {
    return next();
  }

  // Open API 端点跳过 (用签名认证) — 兼容有/无 /api 前缀
  if (req.path.startsWith('/api/open/') || req.path.startsWith('/open/')) {
    return next();
  }

  // 通联支付回调跳过 (由支付平台服务器调用)
  if (req.path.startsWith('/api/allinpay/') || req.path.startsWith('/allinpay/')) {
    return next();
  }

  const cookieToken = req.cookies?.csrf_token;
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken) {
    return sendError(res, ERROR_CODE.FORBIDDEN, 'CSRF Token 缺失');
  }

  if (cookieToken !== headerToken) {
    return sendError(res, ERROR_CODE.FORBIDDEN, 'CSRF Token 验证失败');
  }

  // 校验通过，续期
  res.cookie('csrf_token', cookieToken, {
    httpOnly: false,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: TOKEN_TTL,
    path: '/',
  });

  next();
}
