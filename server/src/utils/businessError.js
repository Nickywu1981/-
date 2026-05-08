/**
 * 业务异常类 — 替代裸 throw { status, message }，符合 ESLint no-throw-literal 规则
 */
class BusinessError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'BusinessError';
    this.status = status;
  }
}

export { BusinessError };
