/**
 * JWT 双令牌系统 — Access Token + Refresh Token + Redis 黑名单
 *
 * Access Token:  15min 短生命周期，每次请求携带
 * Refresh Token: 7d 长生命周期，用于刷新 access token
 * 黑名单:        Redis 存储已吊销的 token，支持主动登出
 */
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { jwtConfig, jwtRefreshSecret } from '../config/index.js';
import logger from '../utils/logger.js';

// ========================= 配置 =========================

const ACCESS_EXPIRES = jwtConfig.accessExpiresIn;
const REFRESH_EXPIRES = jwtConfig.refreshExpiresIn;
const ACCESS_SECRET = jwtConfig.secret;
// Refresh secret 由 config/index.js 统一管理（环境变量 OR 开发环境从 JWT_SECRET 派生）
const REFRESH_SECRET = jwtRefreshSecret;

// 动态加载 Redis（不做硬依赖，Redis 离线跳过黑名单校验）
let redis = null;
async function getRedis() {
  if (redis !== null) return redis;
  try {
    const mod = await import('../dao/redis.js');
    redis = await mod.getRedis() || false;
  } catch (err) {
    logger.warn('[JWT] Redis 加载失败，跳过黑名单功能', { error: err.message });
    redis = false;
  }
  return redis;
}

// ========================= 生成 =========================

/**
 * 签发生成 token pair
 * @param {{ id: number, username: string, role: string, tenantId: number }} user
 * @returns {{ accessToken: string, refreshToken: string, expiresIn: number }}
 */
export function generateTokens(user) {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role || 'user',
    tenantId: user.tenantId || 0,
  };

  const accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
  const jti = crypto.randomUUID();
  const refreshToken = jwt.sign({ id: user.id, jti }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });

  return { accessToken, refreshToken, expiresIn: 900 }; // 15min in seconds
}

// ========================= 校验 =========================

/**
 * 校验 access token
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

/**
 * 校验 refresh token 并返回新 token pair
 */
export async function refreshAccessToken(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, REFRESH_SECRET);
  } catch (err) {
    if (err.name !== 'TokenExpiredError' && err.name !== 'JsonWebTokenError' && err.name !== 'NotBeforeError') {
      logger.warn('[JWT] refreshAccessToken 验证异常', { error: err.message });
    }
    return null;
  }

  // 检查 refresh token 是否在黑名单中
  const r = await getRedis();
  if (r && payload.jti) {
    const blacklisted = await r.get(`rt_blacklist:${payload.jti}`);
    if (blacklisted) return null;
  }

  // 原子抢占：SETNX 防止并发 refresh 重复颁发 token
  if (r && payload.jti) {
    const claimed = await r.set(`rt_refreshing:${payload.jti}`, '1', 'EX', 10, 'NX');
    if (!claimed) {
      logger.warn('[JWT] refresh race detected, rejecting', { userId: payload.id });
      return null;
    }
  }

  // 颁发新 token pair，同时吊销旧 refresh token
  // 从 DB 获取最新角色信息，避免刷新后角色过期（动态 import 避免测试 mock 链断裂）
  let username = ''; let role = 'user';
  try {
    const { findById } = await import('../dao/userDao.js');
    const user = await findById(payload.id);
    if (user) {
      username = user.username || '';
      role = user.role || 'user';
    }
  } catch (e) { logger.warn('[JWT] 刷新时查用户失败', { userId: payload.id, error: e.message }); }

  const newTokens = generateTokens({
    id: payload.id,
    username,
    role,
    tenantId: 0,
  });

  if (r && payload.jti) {
    // 将旧 refresh token 的 jti 加入黑名单
    const oldTtl = (payload.exp - Math.floor(Date.now() / 1000));
    if (oldTtl > 0) {
      await r.set(`rt_blacklist:${payload.jti}`, '1', 'EX', oldTtl);
    }
  }

  return newTokens;
}

// ========================= 吊销 =========================

/**
 * 吊销 access token（加入黑名单）
 */
export async function revokeAccessToken(token) {
  try {
    const payload = jwt.decode(token);
    if (!payload || !payload.exp) return;
    const ttl = payload.exp - Math.floor(Date.now() / 1000);
    if (ttl <= 0) return;

    const r = await getRedis();
    if (r) {
      await r.set(`jwt_blacklist:${token.slice(-32)}`, '1', 'EX', ttl);
    }
  } catch (e) { logger.warn('[JWT] 黑名单添加失败', { message: e.message }); }
}

/**
 * 检查 access token 是否在黑名单中（含用户级吊销）
 */
export async function isTokenBlacklisted(token) {
  const r = await getRedis();
  if (!r) return false;
  // 检查 token 级黑名单
  const blacklisted = await r.get(`jwt_blacklist:${token.slice(-32)}`);
  if (blacklisted) return true;
  // 检查用户级吊销
  try {
    const payload = jwt.decode(token);
    if (payload?.id) {
      const revokedAt = await r.get(`user_revoke:${payload.id}`);
      if (revokedAt && payload.iat && payload.iat < Number(revokedAt)) return true;
    }
  } catch (e) { logger.warn('[JWT] 解码失败, 按已列入黑名单处理(fail-closed)', { message: e.message }); return true; }
  return false;
}

/**
 * 吊销 refresh token（将其 jti 加入黑名单）
 */
export async function revokeRefreshToken(refreshToken) {
  try {
    const payload = jwt.decode(refreshToken);
    if (!payload || !payload.jti) return;
    const ttl = payload.exp - Math.floor(Date.now() / 1000);
    if (ttl <= 0) return;

    const r = await getRedis();
    if (r) {
      await r.set(`rt_blacklist:${payload.jti}`, '1', 'EX', ttl);
    }
  } catch (e) { logger.warn('[JWT] 黑名单添加失败', { message: e.message }); }
}
export async function revokeAllUserTokens(userId) {
  const r = await getRedis();
  if (r) {
    // 写入用户级吊销标记，所有 token 校验时对比 iat
    await r.set(`user_revoke:${userId}`, String(Math.floor(Date.now() / 1000)), 'EX', 86400 * 7);
  }
}

// ========================= 导出 =========================

export const JWT_CONFIG = {
  accessExpires: ACCESS_EXPIRES,
  refreshExpires: REFRESH_EXPIRES,
};
