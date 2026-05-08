/**
 * 认证中间件（升级版）
 * - JWT 双令牌（Access Token + Refresh Token）
 * - Redis 黑名单校验
 * - 用户级吊销支持
 */
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config/index.js';
import { isTokenBlacklisted } from '../utils/jwtToken.js';
import { error as sendError } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

// ========================= Token 生成 =========================

/**
 * 生成 Access Token（短期，15 分钟）
 * @param {Object} user - { userId, role, tenantId }
 * @returns {string} JWT
 */
export function generateAccessToken(user) {
  return jwt.sign(
    {
      userId: user.userId || user.id,
      role: user.role || 'user',
      tenantId: user.tenantId || 0,
    },
    jwtSecret,
    { expiresIn: '15m' },
  );
}

/**
 * 生成 Refresh Token（长期，7 天）
 * @param {Object} user - { userId }
 * @returns {string} JWT
 */
export function generateRefreshToken(user) {
  return jwt.sign(
    {
      userId: user.userId || user.id,
      type: 'refresh',
    },
    jwtSecret,
    { expiresIn: '7d' },
  );
}

// ========================= 通用 Token 解析 =========================

/**
 * @returns {{ payload: object|null, expired: boolean }}
 */
async function parseToken(header) {
  if (!header || !header.startsWith('Bearer ')) return { payload: null, expired: false };
  const token = header.slice(7);
  try {
    // 检查黑名单
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

// ========================= 认证中间件 =========================

// 无需认证的公开路径前缀
const PUBLIC_PREFIXES = [
  '/api/health',
  '/api/metrics',
  '/api/auth/',
  '/api/user/register',
  '/api/user/login',
  '/api/user/forgot-password',
  '/api/user/reset-password',
  '/api/user/send-code',
  '/api/config',
  '/api/site-config',
  '/api/payment/plans',
  '/api/plans',
  '/api/badges',
  '/api/platforms',
  '/api/compliance',
  '/api/multilingual',
  '/api/size-templates',
  '/api/open',
  '/uploads',
];

function isPublicPath(path) {
  return PUBLIC_PREFIXES.some(p => path === p || path.startsWith(p));
}

export async function authMiddleware(req, res, next) {
  // 公开路径跳过认证
  if (isPublicPath(req.path)) return next();

  // 如果全局 v4.1 认证中间件已鉴权，直接放行（兼容 cookie 认证）
  if (req.user) return next();

  const { payload, expired } = await parseToken(req.headers.authorization);
  if (!payload) {
    if (expired) {
      return sendError(res, ERROR_CODE.EC_AUTH_002, 'Access Token 已过期，请刷新');
    }
    return sendError(res, ERROR_CODE.UNAUTHORIZED, '未提供有效认证令牌');
  }

  req.user = payload;
  req.tenantId = payload.tenantId || 0;
  next();
}

// ========================= 可选认证 =========================

export async function optionalAuth(req, _res, next) {
  const { payload } = await parseToken(req.headers.authorization);
  if (payload) {
    req.user = payload;
    req.tenantId = payload.tenantId || 0;
  }
  next();
}

// ========================= 管理员认证（P0-3 接入 RBAC） =========================

import { hasRole, ROLES } from './rbac.js';

export function adminAuth(req, res, next) {
  if (!req.user || !hasRole(req.user, 'admin')) {
    return sendError(res, ERROR_CODE.FORBIDDEN, '需要管理员权限');
  }
  next();
}

/** 编辑及以上权限（审核模板、管理素材等） */
export function editorAuth(req, res, next) {
  if (!req.user || !hasRole(req.user, 'editor')) {
    return sendError(res, ERROR_CODE.FORBIDDEN, '需要编辑及以上权限');
  }
  next();
}

// ========================= 超级管理员认证 =========================

export function superAdminAuth(req, res, next) {
  if (!req.user || req.user.role !== 'super_admin') {
    return sendError(res, ERROR_CODE.FORBIDDEN, '需要超级管理员权限');
  }
  next();
}

export { ROLES };

// ========================= Refresh Token 中间件 =========================

/**
 * Refresh Token 校验中间件
 * - 从 httpOnly cookie 中读取 refreshToken
 * - 校验有效性及黑名单
 * - 生成新 accessToken 挂载到 req.newAccessToken
 * - 挂载 user 到 req.user
 * - 用于 POST /api/user/refresh 端点
 */
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

  // 确保是 refresh 类型令牌，防止 access token 误用
  if (payload.type !== 'refresh') {
    return sendError(res, ERROR_CODE.EC_AUTH_002, '令牌类型错误，请使用 Refresh Token');
  }

  // 生成新的短期 access token
  req.newAccessToken = generateAccessToken({
    userId: payload.userId,
    role: payload.role || 'user',
    tenantId: payload.tenantId || 0,
  });

  // 挂载用户信息，供后续 controller 使用
  req.user = {
    userId: payload.userId,
    role: payload.role || 'user',
    tenantId: payload.tenantId || 0,
  };

  next();
}
