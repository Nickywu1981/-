import { error as sendError } from './response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

const DANGEROUS_PATTERNS = [
  /(\bOR\b.*=.*=)/i,
  /(\bUNION\b.*\bSELECT\b)/i,
  /(;\s*(DROP|DELETE|TRUNCATE|UPDATE|INSERT)\b)/i,
  /('.*\bOR\b.*')/i,
  /(--)/,
  /(\/\*.*\*\/)/,
  /sleep\s*\(/i,
  /benchmark\s*\(/i,
  /information_schema\./i,
  /waitfor\s+delay/i,
];

export function guardSQL(value, fieldName = 'unknown') {
  if (value === null || value === undefined) return value;
  if (typeof value === 'number') return value;

  const str = String(value);
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(str)) {
      const err = new Error(`SQL注入风险拦截 [${fieldName}]`);
      err.sqlGuard = true;
      throw err;
    }
  }
  return value;
}

function scanValues(obj, prefix = '') {
  if (obj === null || obj === undefined) return;
  if (typeof obj === 'string') { guardSQL(obj, prefix); return; }
  if (Array.isArray(obj)) { obj.forEach((v, i) => scanValues(v, `${prefix}[${i}]`)); return; }
  if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      scanValues(value, prefix ? `${prefix}.${key}` : key);
    }
  }
}

export function sqlGuardMiddleware(req, res, next) {
  try {
    scanValues(req.query, 'query');
    if (req.body && typeof req.body === 'object') scanValues(req.body, 'body');
    next();
  } catch (err) {
    if (err.sqlGuard) {
      return sendError(res, ERROR_CODE.BAD_REQUEST, 'Request contains invalid characters');
    }
    next(err);
  }
}
