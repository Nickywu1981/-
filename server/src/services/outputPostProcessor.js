/**
 * AI 输出后处理服务 — Output PostProcessor
 *
 * 功能：
 * 1. 统一错误码与用户友好提示
 * 2. 输出格式转换（Markdown→HTML 等）
 * 3. 结果自动归档（对话历史持久化）
 */
import logger from '../utils/logger.js';

// ==================== 统一错误码 ====================

const AI_ERROR_CODES = {
  // 超时
  AI_TIMEOUT:           { code: 'AI_TIMEOUT',           userMessage: 'AI 响应超时，请稍后重试',                        httpStatus: 504 },
  AI_STREAM_TIMEOUT:    { code: 'AI_STREAM_TIMEOUT',    userMessage: 'AI 流式响应超时，请重新发送请求',               httpStatus: 504 },
  // 模型不可用
  AI_MODEL_UNAVAILABLE: { code: 'AI_MODEL_UNAVAILABLE', userMessage: 'AI 服务暂时不可用，已自动切换到备用模型',        httpStatus: 503 },
  AI_CIRCUIT_OPEN:      { code: 'AI_CIRCUIT_OPEN',      userMessage: 'AI 服务熔断中，请稍后重试',                     httpStatus: 503 },
  AI_ALL_DOWN:          { code: 'AI_ALL_DOWN',           userMessage: '所有 AI 服务暂不可用，请稍后重试',               httpStatus: 503 },
  // 限流
  AI_RATE_LIMITED:      { code: 'AI_RATE_LIMITED',       userMessage: '请求过于频繁，请稍后再试',                     httpStatus: 429 },
  AI_QUOTA_EXCEEDED:    { code: 'AI_QUOTA_EXCEEDED',     userMessage: 'AI 用量已超配额，请联系管理员升级',             httpStatus: 429 },
  // 内容安全
  AI_CONTENT_BLOCKED:   { code: 'AI_CONTENT_BLOCKED',    userMessage: '内容包含敏感信息，请修改后重试',                httpStatus: 400 },
  AI_OUTPUT_BLOCKED:    { code: 'AI_OUTPUT_BLOCKED',     userMessage: 'AI 生成内容存在异常，请重新发起请求',           httpStatus: 400 },
  // 权限
  AI_MODEL_FORBIDDEN:   { code: 'AI_MODEL_FORBIDDEN',    userMessage: '您没有权限使用该 AI 模型',                     httpStatus: 403 },
  AI_GEO_BLOCKED:       { code: 'AI_GEO_BLOCKED',        userMessage: '该 AI 服务在您所在地区不可用',                  httpStatus: 403 },
  // 参数
  AI_INVALID_INPUT:     { code: 'AI_INVALID_INPUT',       userMessage: '请求参数有误，请检查后重试',                   httpStatus: 400 },
  // 通用
  AI_UNKNOWN_ERROR:     { code: 'AI_UNKNOWN_ERROR',       userMessage: 'AI 服务异常，请稍后重试',                      httpStatus: 500 },
};

// 匹配规则按优先级排序：组合模式 > 状态码 > 单关键词
const ERROR_MATCHERS = [
  // [0] 显式错误码（最高优先级）
  { test: (msg, err) => err?.code && AI_ERROR_CODES[err.code], get: (msg, err) => AI_ERROR_CODES[err.code] },
  // [1] 超时（组合：流式+超时）
  { test: (msg) => /流式.*(?:超时|timeout)|(?:超时|timeout).*流式/i.test(msg), get: () => AI_ERROR_CODES.AI_STREAM_TIMEOUT },
  { test: (msg) => /超时|timeout|timed\s*out/i.test(msg), get: () => AI_ERROR_CODES.AI_TIMEOUT },
  // [2] 全部不可用
  { test: (msg) => /全部.*(?:失败|不可用|down)|all.*(?:fail|unavailable|down)/i.test(msg), get: () => AI_ERROR_CODES.AI_ALL_DOWN },
  // [3] 熔断
  { test: (msg) => /熔断|熔断器|circuit\s*breaker/i.test(msg), get: () => AI_ERROR_CODES.AI_CIRCUIT_OPEN },
  // [4] 限流/配额
  { test: (msg) => /rate\s*limit|频繁|429/i.test(msg), get: () => AI_ERROR_CODES.AI_RATE_LIMITED },
  { test: (msg) => /配额|quota/i.test(msg), get: () => AI_ERROR_CODES.AI_QUOTA_EXCEEDED },
  // [5] 内容安全
  { test: (msg) => /违规|敏感|content\s*block|output\s*block/i.test(msg), get: () => AI_ERROR_CODES.AI_CONTENT_BLOCKED },
  // [6] 权限/GEO
  { test: (msg) => /forbidden|权限|403/i.test(msg), get: () => AI_ERROR_CODES.AI_MODEL_FORBIDDEN },
  { test: (msg) => /地区|region|GEO/i.test(msg), get: () => AI_ERROR_CODES.AI_GEO_BLOCKED },
  // [7] 模型不可用（含503）
  { test: (msg) => /不可用|unavailable|503/i.test(msg), get: () => AI_ERROR_CODES.AI_MODEL_UNAVAILABLE },
  // [8] 参数错误（含400）
  { test: (msg) => /参数.*(?:错误|无效)|invalid|400/i.test(msg), get: () => AI_ERROR_CODES.AI_INVALID_INPUT },
];

/**
 * 根据原始错误信息匹配友好错误码
 * 使用优先级匹配表，避免 if/else 链顺序依赖
 */
export function normalizeError(err) {
  if (!err) return AI_ERROR_CODES.AI_UNKNOWN_ERROR;
  const msg = err.message || err.toString();
  for (const matcher of ERROR_MATCHERS) {
    if (matcher.test(msg, err)) return matcher.get(msg, err);
  }
  return AI_ERROR_CODES.AI_UNKNOWN_ERROR;
}

/**
 * 构建标准化错误响应
 * @param {Error|string} err - 原始错误
 * @param {object} [extra] - 额外字段 { traceId, modelId, ... }
 */
export function buildErrorResponse(err, extra = {}) {
  const normalized = normalizeError(err);
  return {
    code: normalized.code,
    message: normalized.userMessage,
    httpStatus: normalized.httpStatus,
    ...(extra.traceId ? { traceId: extra.traceId } : {}),
    ...(extra.modelId ? { modelId: extra.modelId } : {}),
    ...(process.env.NODE_ENV === 'development' ? { detail: err?.message || err } : {}),
  };
}

// ==================== 输出格式转换 ====================

/**
 * Markdown → HTML 转换（简易版，生产环境建议用 marked/showdown）
 * 注意：嵌套格式（如代码块内含加粗）可能产生非预期 HTML
 */
export function markdownToHtml(text) {
  if (!text || typeof text !== 'string') return text;

  let html = text;

  // 1. 代码块 & 行内代码 — 必须最先处理，防止内部格式被后续正则破坏
  html = html.replace(/`{3}(\w*)\n([\s\S]*?)`{3}/g, '<pre><code class="$1">$2</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // 2. Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // 3. Bold / Italic（代码块已处理，不会误匹配）
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // 4. Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

  // 5. Lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // 6. Paragraphs (double newlines)
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';
  html = html.replace(/<p><h(\d)>/g, '<h$1>').replace(/<\/h(\d)><\/p>/g, '</h$1>');
  html = html.replace(/<p><ul>/g, '<ul>').replace(/<\/ul><\/p>/g, '</ul>');
  html = html.replace(/<p><pre>/g, '<pre>').replace(/<\/pre><\/p>/g, '</pre>');

  return html;
}

/**
 * 输出后处理管线
 * 格式转换 + 输出脱敏 + 结果标注
 * 注意：sanitize=true 时需 await，否则脱敏结果不会生效
 */
export async function postProcessOutput(output, opts = {}) {
  const { format = 'raw', sanitize = false } = opts;
  let processed = output;

  if (format === 'html' && typeof processed === 'string') {
    processed = markdownToHtml(processed);
  }

  if (sanitize && typeof processed === 'string') {
    try {
      const { sanitizePII } = await import('./inputSanitizerService.js');
      const result = sanitizePII(processed);
      if (result.maskedCount > 0) {
        processed = result.sanitized;
      }
    } catch { /* PII sanitization unavailable */ }
  }

  return processed;
}

export { AI_ERROR_CODES };
export default { normalizeError, buildErrorResponse, markdownToHtml, postProcessOutput, AI_ERROR_CODES };
