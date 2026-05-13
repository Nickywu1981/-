/**
 * 输入敏感信息自动脱敏服务 — Input Sanitizer
 *
 * PII 自动检测与脱敏：手机号、身份证、银行卡、邮箱等
 * 在请求进入模型前自动替换敏感信息，保护用户隐私
 */
import logger from '../utils/logger.js';

// PII 检测规则
const PII_PATTERNS = [
  {
    name: 'phone',
    pattern: /1[3-9]\d{9}/g,
    mask: (m) => `${m.slice(0, 3)}****${m.slice(-4)}`,
  },
  {
    name: 'idCard',
    pattern: /\b\d{6}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]\b/g,
    mask: (m) => `${m.slice(0, 6)}********${m.slice(-4)}`,
  },
  {
    name: 'bankCard',
    pattern: /\b\d{16,19}\b/g,
    mask: (m) => `${m.slice(0, 4)}****${m.slice(-4)}`,
  },
  {
    name: 'email',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    mask: (m) => {
      const [user, domain] = m.split('@');
      return `${user.slice(0, 2)}***@${domain}`;
    },
  },
];

/**
 * 检测文本中的 PII 类型
 */
export function detectPII(text) {
  if (!text || typeof text !== 'string') return [];
  const found = [];
  for (const rule of PII_PATTERNS) {
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    const matches = text.match(regex);
    if (matches) {
      found.push({ type: rule.name, count: matches.length });
    }
  }
  return found;
}

/**
 * 脱敏文本中的所有 PII
 * @returns {{ sanitized: string, maskedCount: number, detectedTypes: string[] }}
 */
export function sanitizePII(text) {
  if (!text || typeof text !== 'string') return { sanitized: text, maskedCount: 0, detectedTypes: [] };

  let sanitized = text;
  let maskedCount = 0;
  const detectedTypes = [];

  for (const rule of PII_PATTERNS) {
    const matches = text.match(rule.pattern);
    if (matches && matches.length > 0) {
      detectedTypes.push(rule.name);
      sanitized = sanitized.replace(rule.pattern, (match) => {
        maskedCount++;
        return rule.mask(match);
      });
    }
  }

  if (maskedCount > 0) {
    logger.info(`[Sanitizer] 脱敏完成: ${maskedCount} 处, 类型: ${detectedTypes.join(',')}`);
  }

  return { sanitized, maskedCount, detectedTypes };
}

/**
 * 递归脱敏对象中所有字符串值
 */
export function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (typeof obj === 'string') {
    const { sanitized } = sanitizePII(obj);
    return sanitized;
  }
  if (Array.isArray(obj)) return obj.map(v => sanitizeObject(v));

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      const { sanitized } = sanitizePII(value);
      result[key] = sanitized;
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export default { sanitizePII, sanitizeObject, detectPII };
