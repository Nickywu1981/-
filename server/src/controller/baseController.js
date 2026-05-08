/**
 * 基础 Controller — 封装通用依赖
 * 所有业务 Controller 需 import 此模块
 */
export { parsePagination, paginatedQuery, paginationSQL } from '../utils/pagination.js';
export { success, error, listResult, mockSuccess } from '../utils/response.js';
export { ERROR_CODE, ERROR_MSG } from '../constants/errorCode.js';

/**
 * 轻量包装：Controller 层统一入口
 * 未来可在此扩展鉴权注入、日志、限流等
 */
export function defineController(handlers) {
  return handlers;
}
