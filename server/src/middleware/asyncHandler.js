/**
 * 异步路由处理包装器 — 自动捕获 async controller 中的异常转发给 Express 错误处理
 * 用法: router.get('/path', asyncHandler(controllerFn))
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default { asyncHandler };
