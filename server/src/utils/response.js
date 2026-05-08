/**
 * 统一 API 响应工具 — Express 辅助函数
 * 所有 Controller 必须通过此工具返回数据
 */

/**
 * 成功响应
 * @param {import('express').Response} res
 * @param {object|Array} [data={}]
 * @param {string} [msg='success']
 */
export function success(res, data = {}, msg = 'success') {
  return res.json({ code: 200, msg, data });
}

/**
 * 分页列表成功响应
 * @param {import('express').Response} res
 * @param {{ list: Array, total: number, page: number, pageSize: number }} result
 * @param {string} [msg='success']
 */
export function listResult(res, result, msg = 'success') {
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
 * 错误响应
 * @param {import('express').Response} res
 * @param {number} code - 业务错误码
 * @param {string} [msg='服务异常']
 * @param {object|null} [data=null]
 */
export function error(res, code = 500, msg = '服务异常', data = null) {
  // 仅 HTTP 状态码范围内(100-599)的 code 才设 res.status；业务错误码如 4201 保持 HTTP 200
  if (code >= 100 && code < 600) {
    res.status(code);
  }
  return res.json({ code, msg, data });
}

/**
 * Mock 成功响应
 * @param {import('express').Response} res
 * @param {object} [data={}]
 */
export function mockSuccess(res, data = {}) {
  return res.json({ code: 200, msg: 'success', data: { isMock: true, ...data } });
}
