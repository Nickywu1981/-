/**
 * 错误消息脱敏工具
 * 将原始技术错误（SQL 错误、网络堆栈等）映射为用户友好的提示
 */

const GENERIC_ERROR = '操作失败，请稍后重试';
const NETWORK_ERROR = '网络连接异常，请检查网络';

/** 技术错误关键词 → 用户友好消息 */
const SANITIZE_MAP: [RegExp, string][] = [
  [/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ERR_NETWORK|NetworkError/i, NETWORK_ERROR],
  [/SQL|ER_DUP_ENTRY|ER_PARSE_ERROR|mysql|sqlite|postgres/i, GENERIC_ERROR],
  [/timeout|TIMEDOUT/i, '请求超时，请重试'],
  [/5\d{2}\s*(Internal|Service)/i, '服务器繁忙，请稍后重试'],
  [/4\d{2}\s*(Not Found|Bad Request)/i, '请求有误，请检查后重试'],
  [/permission|unauthorized|forbidden/i, '没有权限执行此操作'],
  [/token|jwt|signature/i, '登录已过期，请重新登录'],
  [/undefined|null|TypeError|ReferenceError/i, GENERIC_ERROR],
];

/**
 * 将技术错误消息转换为用户友好提示
 * @param err - 错误对象或消息字符串
 * @param fallback - 无匹配时的默认消息
 */
export function sanitizeError(err: unknown, fallback?: string): string {
  if (!err) return fallback || GENERIC_ERROR;

  // 如果已经是用户友好的简短消息（来自后端 BusinessError），直接返回
  if (typeof err === 'string') {
    const msg = err.trim();
    // 短消息（<50字符）且不含技术关键词，视为已脱敏
    if (msg.length < 50 && !/error|exception|trace|at\s/i.test(msg)) {
      return msg;
    }
    // 否则走关键词匹配
    for (const [re, friendly] of SANITIZE_MAP) {
      if (re.test(msg)) return friendly;
    }
    return fallback || GENERIC_ERROR;
  }

  // Fetch error / $fetch error object
  const e = err as Record<string, any>;

  // 优先使用后端返回的 msg
  if (e?.data?.msg && typeof e.data.msg === 'string' && e.data.msg.length < 80) {
    return e.data.msg;
  }

  // 状态码判断
  const status = e?.status || e?.statusCode || e?.response?.status;
  if (status === 401) return '登录已过期，请重新登录';
  if (status === 403) return '没有权限执行此操作';
  if (status === 404) return '请求的资源不存在';
  if (status && status >= 500) return '服务器繁忙，请稍后重试';

  const msg = e?.message || String(err);
  for (const [re, friendly] of SANITIZE_MAP) {
    if (re.test(msg)) return friendly;
  }

  return fallback || GENERIC_ERROR;
}

/**
 * 获取适合 toast 展示的简短错误消息
 */
export function toastError(err: unknown, fallback?: string): string {
  const msg = sanitizeError(err, fallback);
  return msg.length > 40 ? [...msg].slice(0, 40).join('') + '...' : msg;
}
