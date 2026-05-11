/**
 * Gateway — 全链路追踪中间件
 *
 * 为每个请求注入 X-Correlation-Id，透传至下游服务，实现请求链路追踪。
 * - 优先从请求头 X-Correlation-Id 继承（跨服务传递）
 * - 未提供时自动生成 UUID v4
 * - 同时注入 X-Request-Start 时间戳（毫秒）
 * - 响应头回写 X-Correlation-Id
 */
import { randomUUID } from 'crypto';

export function correlationIdMiddleware(req, res, next) {
  const existing = req.headers['x-correlation-id'];
  const correlationId = existing || randomUUID();

  // 挂载到 request 对象，供下游中间件和日志使用
  req.correlationId = correlationId;

  // 响应头回写，便于客户端追踪
  res.setHeader('X-Correlation-Id', correlationId);

  // 请求到达时间戳（毫秒），供延迟计算
  res.setHeader('X-Request-Start', String(Date.now()));

  next();
}

/**
 * 从 request 对象获取 CorrelationId（供日志/审计使用）
 */
export function getCorrelationId(req) {
  return req.correlationId || req.headers?.['x-correlation-id'] || 'unknown';
}
