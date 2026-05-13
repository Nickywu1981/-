/**
 * 参数过滤中间件
 * - 对 req.body/req.query/req.params 做 trim + 基础清洗
 * - 防止 SQL 注入关键字
 * - 防止 XSS 标签
 */

import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';

// XSS/注入检测正则
const INJECTION_PATTERNS = [
  /<script\b[^>]*>/i,
  /<\/script>/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /union\s+select/i,
  /drop\s+table/i,
  /alter\s+table/i,
  /exec(\s|\+)+(s|x)p\w+/i,
];

function sanitize(value) {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (Array.isArray(value)) {
    return value.map(sanitize);
  }
  if (value && typeof value === 'object') {
    const cleaned = {};
    for (const [k, v] of Object.entries(value)) {
      cleaned[k] = sanitize(v);
    }
    return cleaned;
  }
  return value;
}

/** 检查单值是否包含注入特征 */
function containsInjection(value) {
  if (typeof value !== 'string') return false;
  return INJECTION_PATTERNS.some((pattern) => pattern.test(value));
}

/** 递归扫描对象中是否有注入 */
function scanForInjection(obj) {
  if (!obj || typeof obj !== 'object') return false;
  for (const v of Object.values(obj)) {
    if (typeof v === 'string' && containsInjection(v)) return true;
    if (v && typeof v === 'object' && scanForInjection(v)) return true;
  }
  return false;
}

export default function paramFilter(req, _res, next) {
  // Trim all inputs
  if (req.body && typeof req.body === 'object') {
    req.body = sanitize(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitize(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitize(req.params);
  }

  // Injection scan — reject suspicious input
  if (scanForInjection(req.body) || scanForInjection(req.query)) {
    return next(new BusinessError(ERROR_CODE.BAD_REQUEST, 'Request contains illegal characters'));
  }

  next();
}
