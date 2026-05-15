/**
 * Movio AI v4.1 — Audit Log Middleware
 * G5 后端开发 | 中间件链第5层
 * 记录所有 mutating 操作的审计日志 (Winston + DB)
 */
import { getLogger } from '../utils/logger.js';

const auditLogger = getLogger('audit');

function toAction(method, path) {
  if (method === 'POST') return path.includes('/batch') ? 'batch_create' : 'create';
  if (method === 'PUT' || method === 'PATCH') return 'update';
  if (method === 'DELETE') return 'delete';
  return method.toLowerCase();
}

export function auditLogMiddleware(req, res, next) {
  const startTime = Date.now();

  // 拦截响应以记录结果
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    const duration = Date.now() - startTime;

    // 仅记录 mutating 请求
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const entry = {
        user_id: req.user?.id || null,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        duration_ms: duration,
        ip: req.ip,
        user_agent: req.get('user-agent')?.substring(0, 200),
      };
      auditLogger.info(entry);

      // 异步写入 DB（不阻塞响应）
      import('../dao/auditLogDao.js').then(({ insert }) => {
        insert({
          userId: entry.user_id,
          action: toAction(req.method, req.originalUrl),
          targetType: req.baseUrl?.replace('/api/admin/', '') || 'unknown',
          targetId: req.params?.id || null,
          targetTitle: req.originalUrl,
          details: { method: req.method, statusCode: res.statusCode, durationMs: duration },
          ip: entry.ip,
          userAgent: entry.user_agent,
        }).catch(() => {}); // 静默失败，不影响主流程
      }).catch(() => {});
    }

    return originalJson(body);
  };

  next();
}
