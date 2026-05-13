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

/**
 * 根据原始错误信息匹配友好错误码
 */
export function normalizeError(err) {
  if (!err) return AI_ERROR_CODES.AI_UNKNOWN_ERROR;

  const msg = err.message || err.toString();

  if (msg.includes('超时') || msg.includes('timeout') || msg.includes('timed out')) {
    return msg.includes('流式') ? AI_ERROR_CODES.AI_STREAM_TIMEOUT : AI_ERROR_CODES.AI_TIMEOUT;
  }
  if (msg.includes('熔断') || msg.includes('circuit breaker') || msg.includes('熔断器')) {
    return AI_ERROR_CODES.AI_CIRCUIT_OPEN;
  }
  if (msg.includes('全部') && (msg.includes('失败') || msg.includes('不可用'))) {
    return AI_ERROR_CODES.AI_ALL_DOWN;
  }
  if (msg.includes('不可用') || msg.includes('unavailable') || msg.includes('503')) {
    return AI_ERROR_CODES.AI_MODEL_UNAVAILABLE;
  }
  if (msg.includes('频繁') || msg.includes('rate limit') || msg.includes('429')) {
    return AI_ERROR_CODES.AI_RATE_LIMITED;
  }
  if (msg.includes('配额') || msg.includes('quota')) {
    return AI_ERROR_CODES.AI_QUOTA_EXCEEDED;
  }
  if (msg.includes('违规') || msg.includes('敏感') || msg.includes('blocked')) {
    return AI_ERROR_CODES.AI_CONTENT_BLOCKED;
  }
  if (msg.includes('权限') || msg.includes('forbidden') || msg.includes('403')) {
    return AI_ERROR_CODES.AI_MODEL_FORBIDDEN;
  }
  if (msg.includes('地区') || msg.includes('region') || msg.includes('GEO')) {
    return AI_ERROR_CODES.AI_GEO_BLOCKED;
  }
  if (msg.includes('参数') || msg.includes('invalid') || msg.includes('400')) {
    return AI_ERROR_CODES.AI_INVALID_INPUT;
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
 */
export function markdownToHtml(text) {
  if (!text || typeof text !== 'string') return text;

  let html = text;

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold / Italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Code blocks
  html = html.replace(/`{3}(\w*)\n([\s\S]*?)`{3}/g, '<pre><code class="$1">$2</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

  // Lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // Paragraphs (double newlines)
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
 */
export function postProcessOutput(output, opts = {}) {
  const { format = 'raw', sanitize = false, modelType = 'text' } = opts;
  let processed = output;

  if (format === 'html' && typeof processed === 'string') {
    processed = markdownToHtml(processed);
  }

  if (sanitize && typeof processed === 'string') {
    import('./inputSanitizerService.js').then(({ sanitizePII }) => {
      const result = sanitizePII(processed);
      if (result.maskedCount > 0) {
        processed = result.sanitized;
      }
    }).catch(() => {});
  }

  return processed;
}

export { AI_ERROR_CODES };
export default { normalizeError, buildErrorResponse, markdownToHtml, postProcessOutput, AI_ERROR_CODES };
