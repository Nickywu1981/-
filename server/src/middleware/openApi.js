/**
 * Open API 开发者平台 — 第三方接入 SDK
 *
 * 提供:
 *   /api/open/v1/* 公开 API 端点
 *   API Key 管理 + 签名认证
 *   速率限制 + 用量统计
 */

import crypto from 'crypto';
import { error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

// ========================= API Key 生成 =========================

export function generateApiKey(tenantId, description = '') {
  const prefix = 'movio_';
  const raw = `${tenantId}_${Date.now()}_${crypto.randomBytes(18).toString('hex')}`;
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return `${prefix}${hash.slice(0, 40)}`;
}

// ========================= 签名验证 =========================

/**
 * 验证 API 请求签名
 *
 * 客户端需传:
 *   X-API-Key: movio_xxx
 *   X-Timestamp: Unix timestamp (秒)
 *   X-Signature: HMAC-SHA256(timestamp + method + path + body, apiSecret)
 */
export function verifyApiSignature(apiKey, apiSecret, timestamp, method, path, body, signature) {
  // 时间戳 5 分钟窗口防重放
  const now = Math.floor(Date.now() / 1000);
  const ts = parseInt(timestamp, 10);
  if (!ts || Math.abs(now - ts) > 300) {
    return { ok: false, code: ERROR_CODE.UNAUTHORIZED, msg: '时间戳无效或已过期' };
  }

  const payload = `${timestamp}${method.toUpperCase()}${path}${body || ''}`;
  const expected = crypto.createHmac('sha256', apiSecret).update(payload).digest('hex');

  if (expected !== signature) {
    return { ok: false, code: ERROR_CODE.UNAUTHORIZED, msg: '签名验证失败' };
  }

  return { ok: true };
}

// ========================= Express 中间件 =========================

/**
 * Open API 认证中间件 — 同时支持 API Key + JWT Token
 */
export async function openApiAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  // 优先 API Key
  if (apiKey) {
    const ts = req.headers['x-timestamp'];
    const sig = req.headers['x-signature'];

    if (!ts || !sig) {
      return error(res, ERROR_CODE.UNAUTHORIZED, '缺少 X-Timestamp 或 X-Signature');
    }

    // 从数据库查 API Key 对应的 secret
    let keyRecord;
    try {
      const pool = (await import('../dao/db.js')).default;
      const [rows] = await pool.query(
        'SELECT api_key, api_secret, tenant_id, status, rate_limit, daily_limit FROM open_api_key WHERE api_key = ? AND is_deleted = 0 LIMIT 1',
        [apiKey],
      );
      keyRecord = rows?.[0];
    } catch {
      keyRecord = null;
    }

    if (!keyRecord || keyRecord.status !== 1) {
      return error(res, ERROR_CODE.UNAUTHORIZED, 'API Key 无效或已禁用');
    }

    const body = req.body ? JSON.stringify(req.body) : '';
    const valid = verifyApiSignature(apiKey, keyRecord.api_secret, ts, req.method, req.originalUrl, body, sig);
    if (!valid.ok) {
      return error(res, valid.code, valid.msg);
    }

    req.user = { id: 0, role: 'api', tenantId: keyRecord.tenant_id };
    req.tenantId = keyRecord.tenant_id;
    req.apiKeyRecord = keyRecord;
    return next();
  }

  // 回退到 JWT
  const { authMiddleware } = await import('./auth.js');
  return authMiddleware(req, res, next);
}

// ========================= 速率限制 =========================

/**
 * Open API 专用限流
 */
export async function openApiRateLimit(req, res, next) {
  const key = req.apiKeyRecord;
  if (!key) return next();

  const redis = (await import('../dao/redis.js')).default;
  if (!redis) return next();

  const limitKey = `open_api_rate:${key.api_key}`;
  const current = await redis.incr(limitKey);
  if (current === 1) {
    await redis.expire(limitKey, 60); // 1分钟窗口
  }

  if (current > (key.rate_limit || 60)) {
    return error(res, 429, '请求频率超限，请稍后重试');
  }

  next();
}

export default { generateApiKey, verifyApiSignature, openApiAuth, openApiRateLimit };
