import { error } from './response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

/**
 * 控制器包装器 — 消除重复 try/catch 样板代码
 * 自动捕获异常，优先使用 BusinessError 的状态码，否则回退到 500
 * 用法: export const listPages = wrapController(async (req, res) => { ... });
 */
export function wrapController(fn) {
  return async (req, res, next) => {
    try {
      return await fn(req, res, next);
    } catch (err) {
      return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message);
    }
  };
}
