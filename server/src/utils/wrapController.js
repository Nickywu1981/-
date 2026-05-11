import { error } from './response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { BusinessError } from './businessError.js';

/**
 * 控制器包装器 — 消除重复 try/catch 样板代码
 * 自动捕获异常，BusinessError 返回友好的客户端消息，其他异常返回通用错误
 * 用法: export const listPages = wrapController(async (req, res) => { ... });
 */
export function wrapController(fn) {
  return async (req, res, next) => {
    try {
      return await fn(req, res, next);
    } catch (err) {
      if (err instanceof BusinessError) {
        return error(res, err.status, err.message);
      }
      return error(res, ERROR_CODE.INTERNAL_ERROR, '服务器内部错误');
    }
  };
}
