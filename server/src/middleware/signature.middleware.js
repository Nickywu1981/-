/**
 * API 请求签名校验中间件
 *
 * 签名算法: SHA256(timestamp + AppKey + nonce + method + path + body + secret)
 * 防重放: Redis 存储 nonce (5分钟有效期)
 * 时间窗口: ±5分钟（配置化）
 *
 * 应用于: /api/ai/gateway/* 路由（可选，通过环境变量控制）
 * Headers: X-App-Key, X-Timestamp, X-Nonce, X-Signature
 */
import crypto from 'crypto';
import logger from '../utils/logger.js';
import { error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { securityConfig } from '../config/index.js';

// AppKey → Secret 映射（生产环境从数据库/配置中心加载）
function getAppCredentials() {
  try {
    return JSON.parse(securityConfig.apiAppCredentials);
  } catch (e) {
    logger.warn('[Signature] API AppCredentials 解析失败，签名校验将全部拒绝', { error: e.message });
    return {};
  }
}

// Nonce 防重放存储（开发环境内存存储，生产用 Redis）
const nonceStore = new Map();

async function isNonceUsed(nonce) {
  if (nonceStore.has(nonce)) return true;
  // 尝试 Redis
  try {
    const { default: redis } = await import('../dao/redis.js');
    if (redis) {
      const exists = await redis.get(`signature:nonce:${nonce}`);
      return !!exists;
    }
  } catch { /* Redis 不可用，使用内存存储 */ }
  return false;
}

async function markNonceUsed(nonce) {
  nonceStore.set(nonce, Date.now());
  try {
    const { default: redis } = await import('../dao/redis.js');
    if (redis) {
      await redis.setex(`signature:nonce:${nonce}`, securityConfig.signatureNonceTTL, '1');
    }
  } catch { /* fallback to memory */ }
}

// 定期清理过期 Nonce
setInterval(() => {
  const now = Date.now();
  for (const [nonce, ts] of nonceStore) {
    if (now - ts > securityConfig.signatureNonceTTL * 1000) nonceStore.delete(nonce);
  }
}, 60000).unref();

// ==================== 签名生成/验证 ====================

function buildSignString(timestamp, appKey, nonce, method, path, body) {
  return [timestamp, appKey, nonce, method.toUpperCase(), path, body].join('');
}

function computeSignature(signString, secret) {
  return crypto.createHmac('sha256', secret).update(signString).digest('hex');
}

export function generateSignature(appKey, appSecret, method, path, body = '') {
  const timestamp = Date.now().toString();
  const nonce = crypto.randomUUID();
  const signString = buildSignString(timestamp, appKey, nonce, method, path, body);
  const signature = computeSignature(signString, appSecret);
  return { timestamp, nonce, signature };
}

// ==================== 中间件 ====================

export async function signatureMiddleware(req, res, next) {
  if (!securityConfig.signatureRequired) return next();

  const appKey = req.headers['x-app-key'];
  const timestamp = req.headers['x-timestamp'];
  const nonce = req.headers['x-nonce'];
  const signature = req.headers['x-signature'];

  // 检查必要 Header
  if (!appKey || !timestamp || !nonce || !signature) {
    logger.warn('[Signature] 缺少签名参数', { appKey: !!appKey, timestamp: !!timestamp, nonce: !!nonce, signature: !!signature });
    return error(res, ERROR_CODE.UNAUTHORIZED, '缺少签名参数 (X-App-Key, X-Timestamp, X-Nonce, X-Signature)');
  }

  // 时间窗口检查
  const reqTime = parseInt(timestamp, 10);
  if (isNaN(reqTime) || Math.abs(Date.now() - reqTime) > securityConfig.signatureTimeWindowMs) {
    return error(res, ERROR_CODE.UNAUTHORIZED, '请求时间戳无效或已过期');
  }

  // AppKey 校验
  const credentials = getAppCredentials();
  const secret = credentials[appKey];
  if (!secret) {
    return error(res, ERROR_CODE.UNAUTHORIZED, '无效的 App-Key');
  }

  // Nonce 防重放
  try {
    const used = await isNonceUsed(nonce);
    if (used) {
      return error(res, ERROR_CODE.UNAUTHORIZED, '请求已使用 (nonce 重复)');
    }

    // 签名验证
    const body = req.method === 'GET' ? '' : JSON.stringify(req.body || '');
    const signString = buildSignString(timestamp, appKey, nonce, req.method, req.path, body);
    const expected = computeSignature(signString, secret);

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      logger.warn('[Signature] 签名验证失败', { appKey, path: req.path });
      return error(res, ERROR_CODE.UNAUTHORIZED, '签名验证失败');
    }

    markNonceUsed(nonce);
    logger.info(`[Signature] 验证通过: appKey=${appKey}, path=${req.path}`);
    next();
  } catch (err) {
    logger.error(`[Signature] Nonce check failed: ${err.message}`);
    error(res, ERROR_CODE.INTERNAL_ERROR, '签名校验服务暂不可用');
  }
}

export default signatureMiddleware;
