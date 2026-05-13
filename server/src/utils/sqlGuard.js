import { error as sendError } from './response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

const DANGEROUS_PATTERNS = [
  /(\bOR\b.*=.*=)/i,
  /(\bUNION\b.*\bSELECT\b)/i,
  /(;\s*(DROP|DELETE|TRUNCATE|UPDATE|INSERT)\b)/i,
  /('.*\bOR\b.*')/i,
  /(--)/,
  /(\/\*.*\*\/)/,
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

export function sqlGuardMiddleware(req, res, next) {
  try {
    for (const [key, value] of Object.entries(req.query)) {
      guardSQL(value, `query.${key}`);
    }
    if (req.body && typeof req.body === 'object') {
      for (const [key, value] of Object.entries(req.body)) {
        guardSQL(value, `body.${key}`);
      }
    }
    next();
  } catch (err) {
    if (err.sqlGuard) {
      return sendError(res, ERROR_CODE.BAD_REQUEST, 'Request contains invalid characters');
    }
    next(err);
  }
}
