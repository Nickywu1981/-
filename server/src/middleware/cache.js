import { cacheGet, cacheSet, getRedis } from '../dao/redis.js';
import logger from '../utils/logger.js';

// 进程内互斥锁，防止缓存击穿（并发请求同时触发缓存重建）
const inflight = new Map();

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
    if (req.method !== 'GET') return next();

    try {
      const cacheKey = keyFn
        ? keyFn(req)
        : `cache:${req.tenantId || req.user?.tenantId || 0}:${req.originalUrl}`;

      const cached = await cacheGet(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cached);
      }

      // 缓存击穿保护：相同 key 的并发请求排队等待第一个请求完成
      if (inflight.has(cacheKey)) {
        await inflight.get(cacheKey);
        const retryCached = await cacheGet(cacheKey);
        if (retryCached) {
          res.setHeader('X-Cache', 'HIT');
          return res.json(retryCached);
        }
      }

      let resolveInflight;
      const inflightPromise = new Promise(r => { resolveInflight = r; });
      inflight.set(cacheKey, inflightPromise);
      // 10s 超时防止挂起的请求永久阻塞缓存键
      const inflightTimeout = setTimeout(() => { inflight.delete(cacheKey); resolveInflight(); }, 10_000);

      const originalJson = res.json.bind(res);
      res.json = function (body) {
        if (res.statusCode === 200 && body?.code === 200) {
          cacheSet(cacheKey, body, ttl).catch(err => logger.warn('[Cache] write failed', { key: cacheKey, error: err.message }));
        }
        res.setHeader('X-Cache', 'MISS');
        return originalJson(body);
      };
      const restore = () => {
        res.json = originalJson;
        clearTimeout(inflightTimeout);
        inflight.delete(cacheKey);
        if (resolveInflight) resolveInflight();
      };
      res.on('finish', restore);
      res.on('close', restore);
      res.on('error', restore);

      next();
    } catch (err) {
      logger.warn('[Cache] 中间件失败', { error: err.message });
      next();
    }
  };
}

/**
 * 通过 SCAN 非阻塞清除匹配模式的缓存。
 * O(N) 遍历，分批 200 键，不阻塞 Redis 事件循环。
 */
async function scanAndDel(redis, pattern) {
  let cursor = 0;
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
    cursor = parseInt(nextCursor, 10);
    if (keys.length) await redis.unlink(keys);
  } while (cursor !== 0);
}

export async function invalidateCache(pattern) {
  try {
    const r = await getRedis();
    if (r) {
      await scanAndDel(r, `cache:${pattern}`);
    }
  } catch (e) { logger.warn('[Cache] invalidateCache 失败', { pattern, error: e.message }); }
}
