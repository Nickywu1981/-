/**
 * Platform — 统一认证中心
 *
 * 四层架构 - 中台层 - 认证中心
 * 职责: JWT签发/验证/刷新/黑名单/多端token隔离
 *
 * @deprecated 核心 authMiddleware 逻辑与 middleware/auth.js 完全重复。
 * 当前仅 enterpriseOnly / consumerOnly 等分端守卫被 enterpriseRoutes 使用。
 * generateAccessToken / authMiddleware / optionalAuth / refreshTokenMiddleware
 * 等主体逻辑均未被使用，app.js 使用的是 middleware/auth.js 的版本。
 * 请将分端守卫迁移至 middleware/auth.js 后废弃本文件。
 *
 * 从 middleware/auth.js 提取核心逻辑，增加:
 * - 多端标识 (aud claim): consumer | enterprise | admin | ops
 * - 按端隔离的 token 签发/验证
 * - 统一认证入口供各端路由复用
 */
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config/index.js';
import { isTokenBlacklisted } from '../utils/jwtToken.js';
import { error as sendError } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

// ========================= Token 生成 =========================

/**
 * 生成 Access Token（短期，15 分钟）
 * @param {Object} opts
 * @param {number} opts.userId
 * @param {string} opts.role
 * @param {number} opts.tenantId
 * @param {'consumer'|'enterprise'|'admin'|'ops'} [opts.audience='consumer'] - 所属端
 * @param {number} [opts.enterpriseId] - 企业端专用: 企业ID
 * @param {string} [opts.enterpriseRole] - 企业端专用: 企业内角色
 * @returns {string} JWT
 */
export function generateAccessToken({ userId, role, tenantId, audience = 'consumer', enterpriseId, enterpriseRole }) {
  const payload = {
    userId,
    role: role || 'user',
    tenantId: tenantId || 0,
    aud: audience,
  };
  if (enterpriseId) {
    payload.entId = enterpriseId;
    payload.entRole = enterpriseRole || 'enterprise_operator';
  }
  return jwt.sign(payload, jwtSecret, { expiresIn: '15m' });
}

/**
 * 生成 Refresh Token（长期，7 天）
 */
export function generateRefreshToken({ userId, audience = 'consumer' }) {
  return jwt.sign(
    { userId, type: 'refresh', aud: audience },
    jwtSecret,
    { expiresIn: '7d' },
  );
}

// ========================= 通用 Token 解析 =========================

async function parseToken(header) {
  if (!header || !header.startsWith('Bearer ')) return { payload: null, expired: false };
  const token = header.slice(7);
  try {
    if (await isTokenBlacklisted(token)) return { payload: null, expired: false };
    const payload = jwt.verify(token, jwtSecret);
    return { payload, expired: false };
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return { payload: null, expired: true };
    }
    return { payload: null, expired: false };
  }
}

// ========================= 公开路径白名单 =========================

const PUBLIC_PREFIXES = [
  '/api/health', '/api/metrics',
  '/api/auth/',
  '/api/user/register', '/api/user/login', '/api/user/forgot-password', '/api/user/reset-password', '/api/user/send-code',
  '/api/users/register', '/api/users/login', '/api/users/forgot-password', '/api/users/reset-password',
  '/api/config', '/api/config/version/stream',
  '/api/site-config/public',
  '/api/payment/plans', '/api/payment/notify',
  '/api/allinpay/notify',
  '/api/plans',
  '/api/badges/public',
  '/api/diy/published',
  '/api/open',
  '/api/ai-dispatch/health', '/api/ai-dispatch/categories',
  '/api/internal/',
  '/api/sms/send-code', '/api/sms/verify-code',
  '/api/email/send-code', '/api/email/verify-code',
  '/api/templates/platforms',
  '/api/seo-keywords', '/api/fab/templates', '/api/memory/status',
  '/api/adk/',
  '/api/sdk/',
  '/api/geo',
  '/api/help',
  '/api/platform-specs',
  '/api/forms/public',
  '/uploads',
  // 企业端公开路径
  '/api/enterprise/register', '/api/enterprise/login',
  // 运营端公开路径（如有）
];

const RENEW_WINDOW = 24 * 60 * 60; // 24h

export function isPublicPath(path) {
  if (path.startsWith('/api/docs')) return true;
  if (PUBLIC_PREFIXES.some(p => path === p || path.startsWith(p.endsWith('/') ? p : p + '/'))) return true;
  if (PUBLIC_PREFIXES.some(p => !p.endsWith('/') && path === p)) return true;
  if (path.startsWith('/api/config/') && !path.startsWith('/api/admin/config')) return true;
  if (path.startsWith('/api/diy/published/')) return true;
  return false;
}

// ========================= 认证中间件 =========================

/**
 * 统一认证中间件 — 适用所有端
 * 从 cookie 或 Authorization header 提取 JWT，验证并挂载 req.user
 */
export async function authMiddleware(req, res, next) {
  if (isPublicPath(req.path)) return next();
  if (req.user) return next();

  const tokenFromCookie = req.cookies?.token;
  let { payload, expired } = tokenFromCookie
    ? await parseToken(`Bearer ${tokenFromCookie}`)
    : { payload: null, expired: false };

  if (!payload) {
    ({ payload, expired } = await parseToken(req.headers.authorization));
  }

  if (!payload) {
    if (expired) {
      return sendError(res, ERROR_CODE.EC_AUTH_002, 'Access Token 已过期，请刷新');
    }
    return sendError(res, ERROR_CODE.UNAUTHORIZED, '未提供有效认证令牌');
  }

  req.user = {
    id: payload.userId ?? payload.id,
    userId: payload.userId ?? payload.id,
    role: payload.role || 'user',
    nickname: payload.nickname || '',
    tenantId: payload.tenantId || 0,
    audience: payload.aud || 'consumer',
    entId: payload.entId || null,
    entRole: payload.entRole || null,
  };
  req.userId = req.user.id;
  req.tenantId = req.user.tenantId;

  // 自动续期
  const timeToExpire = payload.exp - Math.floor(Date.now() / 1000);
  if (timeToExpire > 0 && timeToExpire < RENEW_WINDOW) {
    const newToken = jwt.sign(
      {
        userId: req.user.id, role: req.user.role, nickname: req.user.nickname,
        tenantId: req.user.tenantId, aud: req.user.audience,
        entId: req.user.entId, entRole: req.user.entRole,
      },
      jwtSecret,
      { expiresIn: '7d' },
    );
    res.cookie('token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  next();
}

// ========================= 可选认证 =========================

export async function optionalAuth(req, _res, next) {
  const tokenFromCookie = req.cookies?.token;
  const header = tokenFromCookie ? `Bearer ${tokenFromCookie}` : req.headers.authorization;
  const { payload } = await parseToken(header);
  if (payload) {
    req.user = {
      id: payload.userId,
      role: payload.role || 'user',
      tenantId: payload.tenantId || 0,
      audience: payload.aud || 'consumer',
    };
    req.tenantId = payload.tenantId || 0;
  }
  next();
}

// ========================= 分端认证守卫 =========================

import { hasRole } from '../middleware/rbac.js';

/** 要求 consumer 端用户 */
export function consumerOnly(req, res, next) {
  if (!req.user || req.user.audience !== 'consumer') {
    return sendError(res, ERROR_CODE.FORBIDDEN, '仅限C端用户访问');
  }
  next();
}

/** 要求 enterprise 端用户 */
export function enterpriseOnly(req, res, next) {
  if (!req.user || req.user.audience !== 'enterprise') {
    return sendError(res, ERROR_CODE.FORBIDDEN, '仅限企业端用户访问');
  }
  next();
}

/** 管理员认证（复用 RBAC） */
export function adminAuth(req, res, next) {
  if (!req.user || !hasRole(req.user, 'admin')) {
    return sendError(res, ERROR_CODE.FORBIDDEN, '需要管理员权限');
  }
  next();
}

/** 编辑及以上权限 */
export function editorAuth(req, res, next) {
  if (!req.user || !hasRole(req.user, 'editor')) {
    return sendError(res, ERROR_CODE.FORBIDDEN, '需要编辑及以上权限');
  }
  next();
}

/** 超级管理员认证 */
export function superAdminAuth(req, res, next) {
  if (!hasRole(req.user, 'super_admin')) {
    return sendError(res, ERROR_CODE.FORBIDDEN, '需要超级管理员权限');
  }
  next();
}

/** 运营端认证（admin + editor） */
export function opsAuth(req, res, next) {
  if (!req.user || (!hasRole(req.user, 'admin') && !hasRole(req.user, 'editor'))) {
    return sendError(res, ERROR_CODE.FORBIDDEN, '需要运营权限');
  }
  next();
}

// ========================= Refresh Token 中间件 =========================

export async function refreshTokenMiddleware(req, res, next) {
  const token = req.cookies?.refreshToken;
  if (!token) {
    return sendError(res, ERROR_CODE.EC_AUTH_002, '缺少 Refresh Token，请重新登录');
  }

  let payload;
  try {
    if (await isTokenBlacklisted(token)) {
      return sendError(res, ERROR_CODE.EC_AUTH_002, 'Refresh Token 已被吊销，请重新登录');
    }
    payload = jwt.verify(token, jwtSecret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return sendError(res, ERROR_CODE.EC_AUTH_002, 'Refresh Token 已过期，请重新登录');
    }
    return sendError(res, ERROR_CODE.EC_AUTH_002, 'Refresh Token 无效，请重新登录');
  }

  if (payload.type !== 'refresh') {
    return sendError(res, ERROR_CODE.EC_AUTH_002, '令牌类型错误，请使用 Refresh Token');
  }

  req.newAccessToken = generateAccessToken({
    userId: payload.userId,
    role: payload.role || 'user',
    tenantId: payload.tenantId || 0,
    audience: payload.aud || 'consumer',
  });

  req.user = {
    id: payload.userId,
    userId: payload.userId,
    role: payload.role || 'user',
    tenantId: payload.tenantId || 0,
    audience: payload.aud || 'consumer',
  };

  next();
}
