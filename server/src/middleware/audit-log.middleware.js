/**
 * Movio AI v4.1 — Audit Log Middleware
 * G5 后端开发 | 中间件链第5层
 * 记录所有 mutating 操作的审计日志
 */
import { getLogger } from '../utils/logger.js';

const auditLogger = getLogger('audit');

export function auditLogMiddleware(req, res, next) {
  const startTime = Date.now();

  // 拦截响应以记录结果
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    const duration = Date.now() - startTime;

    // 仅记录 mutating 请求
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      auditLogger.info({
        user_id: req.user?.id || null,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        duration_ms: duration,
        ip: req.ip,
        user_agent: req.get('user-agent')?.substring(0, 200),
      });
    }

    return originalJson(body);
  };

  next();
}
