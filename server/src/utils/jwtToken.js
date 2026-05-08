/**
 * JWT 双令牌系统 — Access Token + Refresh Token + Redis 黑名单
 *
 * Access Token:  15min 短生命周期，每次请求携带
 * Refresh Token: 7d 长生命周期，用于刷新 access token
 * 黑名单:        Redis 存储已吊销的 token，支持主动登出
 */
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { jwtConfig } from '../config/index.js';

// ========================= 配置 =========================

const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '7d';
const ACCESS_SECRET = jwtConfig.secret;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || jwtConfig.secret + '_refresh';

// 动态加载 Redis（不做硬依赖，Redis 离线跳过黑名单校验）
let redis = null;
async function getRedis() {
  if (redis !== null) return redis;
  try {
    const mod = await import('../dao/redis.js');
    redis = await mod.getRedis() || false;
  } catch {
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
  } catch {
    return null;
  }

  // 检查 refresh token 是否在黑名单中
  const r = await getRedis();
  if (r && payload.jti) {
    const blacklisted = await r.get(`rt_blacklist:${payload.jti}`);
    if (blacklisted) return null;
  }

  // 颁发新 token pair，同时吊销旧 refresh token
  const newTokens = generateTokens({
    id: payload.id,
    username: '',  // username 不在 refresh payload 中
    role: '',      // 需要从 DB 重新获取
    tenantId: 0,   // 同上
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
  } catch { /* ignore decode errors */ }
}

/**
 * 检查 access token 是否在黑名单中
 */
export async function isTokenBlacklisted(token) {
  const r = await getRedis();
  if (!r) return false;
  const exists = await r.get(`jwt_blacklist:${token.slice(-32)}`);
  return exists !== null;
}

/**
 * 吊销指定用户的所有 token（管理员踢人/用户改密后）
 */
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

export default { generateTokens, verifyAccessToken, refreshAccessToken, revokeAccessToken, isTokenBlacklisted, revokeAllUserTokens, JWT_CONFIG };
