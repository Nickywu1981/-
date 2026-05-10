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

// 无需认证的公开路径（合并了 app 级和路由级白名单）
const PUBLIC_PREFIXES = [
  '/api/health', '/api/metrics',
  '/api/auth/',
  '/api/user/register', '/api/user/login', '/api/user/forgot-password', '/api/user/reset-password', '/api/user/send-code',
  '/api/users/register', '/api/users/login', '/api/users/forgot-password', '/api/users/reset-password',
  '/api/config', '/api/config/version/stream',
  '/api/site-config/public',
  '/api/site-config',
  '/api/payment/plans', '/api/payment/notify',
  '/api/allinpay/notify',
  '/api/plans',
  '/api/badges',
  '/api/compliance',
  '/api/multilingual',
  '/api/size-templates',
  '/api/open',
  '/api/ai-dispatch/health', '/api/ai-dispatch/categories',
  '/api/internal/',
  '/api/sms/send-code', '/api/sms/verify-code',
  '/api/email/send-code', '/api/email/verify-code',
  '/api/diy/published',
  '/api/templates/platforms',
  '/api/template-market/',
  '/api/seo-keywords', '/api/fab/templates', '/api/memory/status',
  '/api/adk/',
  '/api/sdk/',
  '/api/geo',
  '/api/help',
  '/api/platform-specs',
  '/api/forms/public',
  '/uploads',
];

const RENEW_WINDOW = 24 * 60 * 60;  // 24h: token剩余不足1天自动续期

function isPublicPath(path) {
  if (path.startsWith('/api/docs')) return true;  // Swagger UI 子资源
  if (PUBLIC_PREFIXES.some(p => path === p || path.startsWith(p.endsWith('/') ? p : p + '/'))) return true;
  // 精确匹配或前缀匹配（带/后缀的public路径匹配子路径）
  if (PUBLIC_PREFIXES.some(p => !p.endsWith('/') && path === p)) return true;
  // GET /api/config/* 公开（排除 /api/admin/config）
  if (path.startsWith('/api/config/') && !path.startsWith('/api/admin/config')) return true;
  // GET /api/diy/published/:slug 公开
  if (path.startsWith('/api/diy/published/')) return true;
  return false;
}

export async function authMiddleware(req, res, next) {
  // 公开路径跳过认证
  if (isPublicPath(req.path)) return next();

  // 如果已鉴权（全局中间件先运行），直接放行
  if (req.user) return next();

  // 先尝试从 Cookie 中提取 token
  const tokenFromCookie = req.cookies?.token;
  let { payload, expired } = tokenFromCookie
    ? await parseToken(`Bearer ${tokenFromCookie}`)
    : { payload: null, expired: false };

  // Cookie 中无有效 token，尝试 Authorization header
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
    id: payload.userId || payload.id,
    role: payload.role || 'user',
    nickname: payload.nickname || '',
    tenantId: payload.tenantId || 0,
  };
  req.userId = req.user.id;     // 兼容旧代码直接引用 req.userId
  req.tenantId = req.user.tenantId;

  // 自动续期：token 剩余不足 1 天时签发新 token
  const timeToExpire = payload.exp - Math.floor(Date.now() / 1000);
  if (timeToExpire > 0 && timeToExpire < RENEW_WINDOW) {
    const newToken = jwt.sign(
      { userId: req.user.id, role: req.user.role, nickname: req.user.nickname, tenantId: req.user.tenantId },
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

/** 超级管理员认证 */
export function superAdminAuth(req, res, next) {
  if (!hasRole(req.user, 'super_admin')) {
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
