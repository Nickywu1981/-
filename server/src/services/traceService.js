/**
 * 全链路追踪服务 — Trace Service
 *
 * 功能：
 * - 为每个请求生成唯一 TraceID
 * - AsyncLocalStorage 自动传播（无需显式传参）
 * - 支持跨服务传播（W3C Trace Context 兼容）
 * - 对接到 APM 系统（Jaeger/Grafana）
 */
import { AsyncLocalStorage } from 'async_hooks';
import crypto from 'crypto';

const als = new AsyncLocalStorage();

/**
 * 生成 TraceID（32字符 hex）
 */
export function generateTraceId() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * 生成 SpanID（16字符 hex）
 */
export function generateSpanId() {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * 获取当前请求的 Trace 上下文
 * @returns {{ traceId: string, spanId: string, parentSpanId?: string }}
 */
export function getTraceContext() {
  const store = als.getStore();
  return store || { traceId: '00000000000000000000000000000000', spanId: '0000000000000000' };
}

/**
 * 在当前 Trace 上下文中运行函数
 */
export function runWithTrace(traceId, spanId, fn) {
  return als.run({ traceId, spanId }, fn);
}

/**
 * 在当前上下文中创建一个子 Span
 * @returns {function} endSpan — 调用以结束 span
 */
export function startSpan(name, attributes = {}) {
  const parent = getTraceContext();
  const spanId = generateSpanId();

  const span = {
    traceId: parent.traceId,
    spanId,
    parentSpanId: parent.spanId,
    name,
    startTime: Date.now(),
    attributes,
  };

  // 切换到子 Span 上下文
  als.enterWith({ traceId: span.traceId, spanId: span.spanId });

  const endSpan = () => {
    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    // 恢复父上下文
    als.enterWith(parent);
    return span;
  };

  return endSpan;
}

/**
 * 从 HTTP Header 提取 TraceID（W3C traceparent 格式）
 * traceparent: 00-{traceId}-{spanId}-{flags}
 */
export function extractTraceFromHeaders(headers) {
  const traceparent = headers?.['traceparent'];
  if (traceparent) {
    const parts = traceparent.split('-');
    if (parts.length === 4 && parts[0] === '00') {
      return { traceId: parts[1], parentSpanId: parts[2] };
    }
  }
  // 兼容 X-Trace-Id
  const xTraceId = headers?.['x-trace-id'];
  if (xTraceId) {
    return { traceId: xTraceId };
  }
  return null;
}

/**
 * 生成 W3C traceparent header
 */
export function toTraceParent() {
  const ctx = getTraceContext();
  return `00-${ctx.traceId}-${ctx.spanId}-01`;
}

/**
 * 在当前上下文中创建子 Span 并执行 fn，自动清理
 * 用法: const result = await runInSpan('name', { key: 'val' }, async (span) => { ... })
 */
export function runInSpan(name, attributes, fn) {
  const endSpan = startSpan(name, attributes);
  try {
    return fn(endSpan);
  } finally {
    endSpan();
  }
}

export { als };
export default { generateTraceId, generateSpanId, getTraceContext, runWithTrace, startSpan, runInSpan, extractTraceFromHeaders, toTraceParent };
