/**
 * TraceID 中间件
 *
 * 功能：
 * - 提取或生成 TraceID → 挂载到 req.traceId
 * - 注入 AsyncLocalStorage 供下游服务自动获取
 * - 返回 X-Trace-Id / Traceparent 响应头
 */
import { generateTraceId, generateSpanId, extractTraceFromHeaders, runWithTrace, toTraceParent } from '../services/traceService.js';

export function traceMiddleware(req, res, next) {
  // 从请求头提取或新建 TraceID
  const extracted = extractTraceFromHeaders(req.headers);
  const traceId = extracted?.traceId || generateTraceId();
  const parentSpanId = extracted?.parentSpanId || null;

  // 挂载到 req
  req.traceId = traceId;

  // 生成入口 SpanID
  const entrySpanId = generateSpanId();

  // 在 Trace 上下文中运行
  runWithTrace(traceId, entrySpanId, () => {
    // 返回 TraceID 给客户端
    res.setHeader('X-Trace-Id', traceId);
    res.setHeader('Traceparent', toTraceParent());

    next();
  });
}
