/**
 * Platform — 统一审计日志
 *
 * 四层架构 - 中台层 - 审计日志
 * 职责: 操作人/时间/路径/参数/结果/耗时 结构化存储
 *
 * 从 middleware/audit-log.middleware.js 增强:
 * - 增加 source 字段区分 consumer / enterprise / admin / ops
 * - 增加 X-Correlation-Id 关联
 * - 提供查询 API 供管理面板使用
 */
import { getLogger } from '../utils/logger.js';
import { getCorrelationId } from '../gateway/correlationId.js';

const auditLogger = getLogger('audit');

/**
 * 审计日志中间件 — 记录所有 mutating 操作
 */
export function auditLogMiddleware(req, res, next) {
  const startTime = Date.now();

  const originalJson = res.json.bind(res);
  res.json = function (body) {
    const duration = Date.now() - startTime;

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const entry = {
        user_id: req.user?.id || null,
        tenant_id: req.user?.tenantId || 0,
        enterprise_id: req.user?.entId || null,
        source: req.user?.audience || 'unknown',           // consumer | enterprise | admin | ops
        role: req.user?.role || null,
        correlation_id: getCorrelationId(req),
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        duration_ms: duration,
        ip: req.ip,
        user_agent: req.get('user-agent')?.substring(0, 200),
        timestamp: new Date().toISOString(),
      };

      auditLogger.info(entry);
    }

    return originalJson(body);
  };

  next();
}

/**
 * 手动记录审计事件（供 Service 层非 HTTP 场景使用）
 * @param {Object} event
 * @param {number} event.userId
 * @param {string} event.action - 操作类型
 * @param {string} event.target - 操作对象
 * @param {Object} [event.meta] - 附加元数据
 */
export function auditEvent(event) {
  auditLogger.info({
    user_id: event.userId || null,
    tenant_id: event.tenantId || 0,
    source: event.source || 'internal',
    action: event.action || 'unknown',
    target: event.target || '',
    meta: event.meta || {},
    timestamp: new Date().toISOString(),
  });
}
