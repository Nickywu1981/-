/**
 * 统一 API 响应工具 — Express 辅助函数
 * 所有 Controller 必须通过此工具返回数据
 */

import { ERROR_MSG } from '../constants/errorCode.js';

const DEFAULT_ERROR_MSG = '服务异常';

/**
 * 成功响应
 * @param {import('express').Response} res
 * @param {object|Array} [data={}]
 * @param {string} [msg='success']
 */
export function success(res, data = {}, msg = 'success') {
  res.setHeader('Cache-Control', 'private, no-store');
  return res.json({ code: 200, msg, data });
}

/**
 * 分页列表成功响应
 * @param {import('express').Response} res
 * @param {{ list: Array, total: number, page: number, pageSize: number }} result
 * @param {string} [msg='success']
 */
export function listResult(res, result, msg = 'success') {
  res.setHeader('Cache-Control', 'private, no-store');
  return res.json({
    code: 200,
    msg,
    data: {
      list: result.list,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    },
  });
}

/**
 * 将业务错误码映射为 HTTP 状态码
 * - 100-599: 透传 (标准 HTTP 状态码)
 * - 4000-4019: 401 (认证/授权)
 * - 4020-4029: 403 (CSRF)
 * - 4030-4049: 429 (限流)
 * - 4100-4199: 404 (资源)
 * - 4200-4299: 400 (参数)
 * - 4300-4399: 402 (支付)
 * - 4900-4999: 422 (校验)
 */
function httpStatusFor(code) {
  if (code >= 100 && code < 600) return code;
  if (code >= 4000 && code < 4020) return 401;
  if (code >= 4020 && code < 4030) return 403;
  if (code >= 4030 && code < 4050) return 429;
  if (code >= 4100 && code < 4200) return 404;
  if (code >= 4200 && code < 4300) return 400;
  if (code >= 4300 && code < 4400) return 402;
  if (code >= 4900 && code < 5000) return 422;
  return 200;
}

/**
 * 错误响应（消息由 ERROR_MSG 查找，前端 useApi.ts 按 locale 覆盖为 i18n）
 * @param {import('express').Response} res
 * @param {number} code - 业务错误码
 * @param {string} [msg] - 自定义消息（可选，不传则从 ERROR_MSG 查找）
 * @param {object|null} [data=null]
 */
export function error(res, code = 500, msg, data = null) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.status(httpStatusFor(code));
  const fallbackMsg = msg !== undefined ? msg : (ERROR_MSG[code] || DEFAULT_ERROR_MSG);
  return res.json({ code, msg: fallbackMsg, data });
}

/**
 * Mock 成功响应
 * @param {import('express').Response} res
 * @param {object} [data={}]
 */
function mockSuccess(res, data = {}) {
  return res.json({ code: 200, msg: 'success', data: { isMock: true, ...data } });
}
