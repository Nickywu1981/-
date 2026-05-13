/**
 * 认证中间件（升级版）
 * - JWT 双令牌（Access Token + Refresh Token）
 * - Redis 黑名单校验
 * - 用户级吊销支持
 * - 多端标识 (aud claim): consumer | enterprise | admin | ops
 *
 * Phase 0-A (2026-05-11): 增强多端标识支持
 * 新版统一认证中心: server/src/platform/authCenter.js
 */
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config, { jwtSecret, jwtRefreshSecret, isProduction } from '../config/index.js';
import { isTokenBlacklisted } from '../utils/jwtToken.js';
import { error as sendError } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import logger from '../utils/logger.js';

// Refresh secret 由 config/index.js 统一管理（环境变量 OR 开发环境从 JWT_SECRET 派生）
const refreshSecret = jwtRefreshSecret;

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
      aud: user.audience || 'consumer',                // Phase 0-A: 多端标识
      entId: user.entId || null,                       // Phase 0-A: 企业ID
      entRole: user.entRole || null,                   // Phase 0-A: 企业内角色
    },
    jwtSecret,
    { expiresIn: config.jwt.accessExpiresIn || '15m' },
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
      jti: crypto.randomUUID(),
    },
    refreshSecret,
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
    if (process.env.NODE_ENV !== 'production') {
      logger.warn('[Auth] JWT 解析异常', { message: err.message, name: err.name });
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
  '/api/site-config/public/',
  '/api/payment/plans', '/api/payment/notify',
  '/api/allinpay/notify',
  '/api/plans',
  '/api/recharge/callback',
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
  '/api/enterprise/register', '/api/enterprise/login', '/api/enterprise/plans',  // Phase 1: B端公开入口
  '/api/i18n',  // 公开翻译接口（前端SSR/CSR无需登录）
  '/uploads',
];

const RENEW_WINDOW = 24 * 60 * 60;  // 24h: token剩余不足1天自动续期

function _parseDurationMs(str) {
  const m = str.match(/^(\d+)(s|m|h|d)$/);
  if (!m) return 15 * 60 * 1000;
  const v = parseInt(m[1], 10);
  return { s: v * 1000, m: v * 60 * 1000, h: v * 3600 * 1000, d: v * 86400 * 1000 }[m[2]];
}

// 转换为 Set 实现 O(1) 查找，避免每请求 O(n) 扫描
const PUBLIC_PREFIX_SET = new Set(PUBLIC_PREFIXES);
const PUBLIC_PREFIXES_SLASHED = PUBLIC_PREFIXES.filter(p => p.endsWith('/'));

function isPublicPath(path) {
  if (path.startsWith('/api/docs')) return true;
  // 精确匹配
  if (PUBLIC_PREFIX_SET.has(path)) return true;
  // 前缀匹配（路径以 public prefix 开头）
  for (const p of PUBLIC_PREFIXES) {
    if (path.startsWith(p)) {
      // 如果是 /api/auth/ 类 trailing-slash 前缀，放行所有子路径
      if (p.endsWith('/')) return true;
      // 如果是 /api/sms/send-code 类精确前缀，只放行完全匹配的子路径
      // (这类前缀没有 trailing slash，在前面精确匹配中已处理)
    }
  }
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
      return sendError(res, ERROR_CODE.EC_AUTH_002, '认证已过期，请重新登录');
    }
    return sendError(res, ERROR_CODE.UNAUTHORIZED, '未提供有效认证令牌');
  }

  req.user = {
    id: payload.userId ?? payload.id,
    role: payload.role || 'user',
    nickname: payload.nickname || '',
    tenantId: payload.tenantId || 0,
    audience: payload.aud || 'consumer',               // Phase 0-A: 多端标识
    entId: payload.entId || null,                      // Phase 0-A: 企业ID
    entRole: payload.entRole || null,                  // Phase 0-A: 企业内角色
  };
  req.userId = req.user.id;     // 兼容旧代码直接引用 req.userId
  req.tenantId = req.user.tenantId;

  // 自动续期：token 剩余不足 1 天时签发新 token
  const timeToExpire = payload.exp - Math.floor(Date.now() / 1000);
  if (timeToExpire > 0 && timeToExpire < RENEW_WINDOW) {
    const { iat, exp, ...renewPayload } = payload;
    const newToken = jwt.sign(renewPayload, jwtSecret, { expiresIn: config.jwt.accessExpiresIn || '15m' });
    const accessMaxAge = config.jwt.accessExpiresIn
      ? _parseDurationMs(config.jwt.accessExpiresIn)
      : 15 * 60 * 1000;
    res.cookie('token', newToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: accessMaxAge,
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

// ========================= 分端认证守卫 =========================

/** 要求 enterprise 端用户 */
export function enterpriseOnly(req, res, next) {
  if (!req.user || req.user.audience !== 'enterprise') {
    return sendError(res, ERROR_CODE.FORBIDDEN, '仅限企业端用户访问');
  }
  next();
}

/** 要求 consumer 端用户 */
export function consumerOnly(req, res, next) {
  if (!req.user || req.user.audience !== 'consumer') {
    return sendError(res, ERROR_CODE.FORBIDDEN, '仅限C端用户访问');
  }
  next();
}

/** 要求代理端角色（企业端不可用） */
export function requireAgent(req, res, next) {
  const entRole = req.user?.entRole;
  if (!entRole || !['agent_admin', 'agent_operator', 'agent_viewer'].includes(entRole)) {
    return sendError(res, ERROR_CODE.FORBIDDEN, '仅代理端可用此功能');
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
    return sendError(res, ERROR_CODE.EC_AUTH_002, '认证已过期，请重新登录');
  }

  let payload;
  try {
    if (await isTokenBlacklisted(token)) {
      return sendError(res, ERROR_CODE.EC_AUTH_002, '认证已失效，请重新登录');
    }
    payload = jwt.verify(token, refreshSecret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return sendError(res, ERROR_CODE.EC_AUTH_002, '认证已过期，请重新登录');
    }
    return sendError(res, ERROR_CODE.EC_AUTH_002, '认证已过期，请重新登录');
  }

  // 确保是 refresh 类型令牌，防止 access token 误用
  if (payload.type !== 'refresh') {
    return sendError(res, ERROR_CODE.EC_AUTH_002, '认证已过期，请重新登录');
  }

  // 生成新的短期 access token — 保留企业与代理端字段
  const tokenPayload = {
    userId: payload.userId,
    role: payload.role || 'user',
    tenantId: payload.tenantId || 0,
  };
  if (payload.audience) tokenPayload.audience = payload.audience;
  if (payload.entId) tokenPayload.entId = payload.entId;
  if (payload.entRole) tokenPayload.entRole = payload.entRole;

  req.newAccessToken = generateAccessToken(tokenPayload);

  // 挂载用户信息，供后续 controller 使用
  req.user = { ...tokenPayload };

  next();
}
