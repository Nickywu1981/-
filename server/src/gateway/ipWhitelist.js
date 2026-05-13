/**
 * Gateway — 动态 IP 白名单中间件
 *
 * 从 Nginx `geo $admin_allowed` 迁移为可动态配置的 Express 中间件。
 * - 默认白名单: 127.0.0.1 / ::1 / localhost
 * - 支持 Redis 热更新 (key: `ip_whitelist:admin`)
 * - 配置缓存 60 秒，减少 Redis 调用
 * - 非白名单 IP 返回 403
 */

import logger from '../utils/logger.js';

// 默认静态白名单
const DEFAULT_ADMIN_IPS = new Set([
  '127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost',
]);

// 动态白名单缓存
let cachedWhitelist = null;
let cacheTs = 0;
const CACHE_TTL_MS = 60_000; // 60秒

/**
 * 从 Redis 加载动态白名单
 */
async function loadDynamicWhitelist() {
  try {
    const { default: redis } = await import('../dao/redis.js');
    const raw = await redis.get('ip_whitelist:admin');
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return new Set(list);
    }
  } catch (e) {
    logger.warn('[IPWhitelist] Redis 白名单加载失败，降级为静态白名单', { error: e.message });
  }
  return new Set();
}

/**
 * 获取当前生效的白名单
 */
async function getEffectiveWhitelist() {
  if (cachedWhitelist && Date.now() - cacheTs < CACHE_TTL_MS) {
    return cachedWhitelist;
  }
  const dynamic = await loadDynamicWhitelist();
  cachedWhitelist = new Set([...DEFAULT_ADMIN_IPS, ...dynamic]);
  cacheTs = Date.now();
  return cachedWhitelist;
}

/**
 * IP 白名单中间件工厂
 * @param {{ paths?: string[], excludePaths?: string[] }} opts - 受保护的路径前缀和排除路径
 */
export function ipWhitelistMiddleware(opts = {}) {
  const { paths = ['/api/admin', '/api/ops'], excludePaths = [] } = opts;

  return async (req, res, next) => {
    const isProtected = paths.some(p => req.path.startsWith(p))
      && !excludePaths.some(p => req.path.startsWith(p));

    if (!isProtected) return next();

    const whitelist = await getEffectiveWhitelist();
    const clientIp = req.ip?.replace(/^::ffff:/, '') || req.connection?.remoteAddress || '';

    if (whitelist.has(clientIp) || whitelist.has('::ffff:' + clientIp)) {
      return next();
    }

    res.status(403).json({ code: 403, msg: 'IP 不在白名单中，禁止访问管理接口', data: null });
  };
}

/**
 * 手动刷新白名单缓存（供管理接口调用）
 */
export async function refreshIpWhitelist() {
  cacheTs = 0;
  await getEffectiveWhitelist();
}

/**
 * 获取当前白名单列表（供管理面板查看）
 */
export async function getWhitelistEntries() {
  const whitelist = await getEffectiveWhitelist();
  return [...whitelist];
}
