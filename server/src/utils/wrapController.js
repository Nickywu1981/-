import { error } from './response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { BusinessError } from './businessError.js';
import logger from './logger.js';

/**
 * 控制器包装器 — 消除重复 try/catch 样板代码
 * 自动捕获异常，BusinessError 返回友好的客户端消息，其他异常返回通用错误
 * 用法: export const listPages = wrapController(async (req, res) => { ... });
 */
export function wrapController(fn) {
  return async (req, res, next) => {
    try {
      const result = await fn(req, res, next);
      if (result !== undefined && result !== res && !res.headersSent) {
        return success(res, result);
      }
      return result;
    } catch (err) {
      if (err instanceof BusinessError) {
        return error(res, err.status, err.message);
      }
      logger.error('[wrapController] 未预期异常', {
        message: err.message,
        stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
        path: req.path,
        method: req.method,
        userId: req.user?.id || req.user?.userId,
      });
      return error(res, ERROR_CODE.INTERNAL_ERROR, '服务器内部错误');
    }
  };
}
