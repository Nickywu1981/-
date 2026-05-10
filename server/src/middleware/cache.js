import { cacheGet, cacheSet } from '../dao/redis.js';
import logger from '../utils/logger.js';

/**
 * Redis 缓存中间件
 * 自动缓存 GET 请求响应，支持自定义 TTL 和 key 生成策略
 *
 * 用法：
 *   router.get('/plans', cacheMiddleware(600), handler)     // 缓存 10 分钟
 *   router.get('/templates', cacheMiddleware(300, req => `tpl:${req.query.cat}`), handler)
 */

export function cacheMiddleware(ttl = 300, keyFn) {
  return async (req, res, next) => {
    // 只缓存 GET 请求
    if (req.method !== 'GET') return next();

    try {
      const cacheKey = keyFn
        ? keyFn(req)
        : `cache:${req.originalUrl}`;

      const cached = await cacheGet(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cached);
      }

      // 拦截 res.json 以捕获响应体, 完成后恢复原始方法
      const originalJson = res.json.bind(res);
      res.json = function (body) {
        if (res.statusCode === 200 && body?.code === 200) {
          cacheSet(cacheKey, body, ttl).catch(err => logger.warn('[Cache] write failed', { key: cacheKey, error: err.message }));
        }
        res.setHeader('X-Cache', 'MISS');
        return originalJson(body);
      };
      // 响应完成/出错/客户端断开均恢复原始方法
      const restore = () => { res.json = originalJson; };
      res.on('finish', restore);
      res.on('close', restore);
      res.on('error', restore);

      next();
    } catch {
      next(); // 缓存失败不影响主流程
    }
  };
}

/** 清除匹配模式的缓存（通过前缀匹配内存缓存） */
export async function invalidateCache(pattern) {
  try {
    const redis = await import('../dao/redis.js');
    const r = await redis.getRedis();
    if (r) {
      const keys = await r.keys(`cache:${pattern}`);
      if (keys.length) await r.del(keys);
    }
  } catch { /* ignore */ }
}

export default { cacheMiddleware, invalidateCache };
