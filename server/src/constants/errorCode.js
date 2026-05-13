/**
 * 全局错误码常量
 */

export const ERROR_CODE = {
  // 通用
  SUCCESS: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,

  // 业务 - 用户
  USER_EXISTS: 4001,
  USER_NOT_FOUND: 4002,
  PASSWORD_WRONG: 4003,
  TOKEN_EXPIRED: 4004,
  TOKEN_INVALID: 4005,
  ACCOUNT_DISABLED: 4006,
  EC_AUTH_002: 4007,      // Access Token 过期，前端应自动刷新
  REFRESH_TOKEN_EXPIRED: 4008,
  REFRESH_TOKEN_INVALID: 4009,

  // 业务 - 资源
  RESOURCE_NOT_FOUND: 4101,
  RESOURCE_DUPLICATE: 4102,
  QUOTA_EXCEEDED: 4103,

  // 业务 - 参数
  PARAM_MISSING: 4201,
  PARAM_INVALID: 4202,
  PARAM_ERROR: 4203,
  VALIDATION_ERROR: 4901, // Zod schema 校验失败

  // 业务 - 支付
  PAY_ORDER_NOT_FOUND: 4301,
  PAY_ORDER_EXPIRED: 4302,
  PAY_SIGN_FAILED: 4303,
  PAY_CHANNEL_ERROR: 4304,
  PAY_AMOUNT_MISMATCH: 4305,
  PAY_NOTIFY_FAILED: 4306,

  // 业务 - AI推理
  AI_INFER_FAILED: 5001,
  AI_TIMEOUT: 5002,

  // 业务 - 内容审核
  CONTENT_MODERATION: 4401,

  // 业务 - 发布校验
  PUBLISH_VALIDATION: 4402,

  // 业务 - 权限细分 (auth.js)
  EC_AUTH_003: 4010,         // 需要管理员权限
  EC_AUTH_004: 4011,         // 需要编辑及以上权限
  EC_AUTH_005: 4012,         // 需要超级管理员权限
  EC_AUTH_006: 4013,         // 仅限企业端用户
  EC_AUTH_007: 4014,         // 仅限C端用户
  EC_AUTH_008: 4015,         // 仅代理端可用
  EC_AUTH_009: 4016,         // 未提供有效认证令牌
  EC_AUTH_010: 4017,         // Token 已失效(黑名单)

  // 业务 - CSRF (csrf.js)
  EC_CSRF_001: 4020,         // CSRF Token 缺失
  EC_CSRF_002: 4021,         // CSRF Token 验证失败

  // 业务 - 限流细分 (rateLimiter.js)
  EC_RATE_CONCURRENCY: 4030, // 并发请求过多
  EC_RATE_GENERAL: 4031,     // 全局频率限制
  EC_RATE_AUTH: 4032,        // 登录/注册频率限制
  EC_RATE_CODE: 4033,        // 验证码发送频率限制
  EC_RATE_VERIFY: 4034,      // 验证码校验频率限制
  EC_RATE_HEAVY: 4035,       // AI 重度操作频率限制
  EC_RATE_UPLOAD: 4036,      // 上传频率限制
  EC_RATE_PAYMENT: 4037,     // 支付频率限制
  EC_RATE_ADMIN: 4038,       // 管理后台频率限制
  EC_RATE_E2B: 4039,         // E2B 沙箱频率限制
  EC_RATE_E2B_EXEC: 4040,    // E2B 代码执行频率限制
  EC_RATE_E2B_READ: 4041,    // E2B 读取频率限制
  EC_RATE_E2B_DELETE: 4042,  // E2B 删除频率限制
};

/**
 * ERROR_MSG — 服务端 fallback 英文消息。
 * 前端通过 i18n key 映射表中文化，此表仅用于：
 * 1. 直连 API 的第三方（无 i18n 能力）
 * 2. 前端 i18n map 未命中时的兜底
 */
export const ERROR_MSG = {
  [ERROR_CODE.BAD_REQUEST]: 'Bad request',
  [ERROR_CODE.UNAUTHORIZED]: 'Authentication required',
  [ERROR_CODE.PAYMENT_REQUIRED]: 'Payment required',
  [ERROR_CODE.FORBIDDEN]: 'Access denied',
  [ERROR_CODE.NOT_FOUND]: 'Resource not found',
  [ERROR_CODE.INTERNAL_ERROR]: 'Internal server error',

  [ERROR_CODE.USER_EXISTS]: 'User already exists',
  [ERROR_CODE.USER_NOT_FOUND]: 'User not found',
  [ERROR_CODE.PASSWORD_WRONG]: 'Incorrect password',
  [ERROR_CODE.TOKEN_EXPIRED]: 'Token expired',
  [ERROR_CODE.TOKEN_INVALID]: 'Invalid token',
  [ERROR_CODE.ACCOUNT_DISABLED]: 'Account disabled',
  [ERROR_CODE.EC_AUTH_002]: 'Access token expired',
  [ERROR_CODE.REFRESH_TOKEN_EXPIRED]: 'Refresh token expired',
  [ERROR_CODE.REFRESH_TOKEN_INVALID]: 'Invalid refresh token',

  [ERROR_CODE.RESOURCE_NOT_FOUND]: 'Resource not found',
  [ERROR_CODE.RESOURCE_DUPLICATE]: 'Resource already exists',
  [ERROR_CODE.QUOTA_EXCEEDED]: 'Quota exceeded',

  [ERROR_CODE.PARAM_MISSING]: 'Missing required parameter',
  [ERROR_CODE.PARAM_INVALID]: 'Invalid parameter format',
  [ERROR_CODE.PARAM_ERROR]: 'Parameter error',

  [ERROR_CODE.PAY_ORDER_NOT_FOUND]: 'Order not found',
  [ERROR_CODE.PAY_ORDER_EXPIRED]: 'Order expired',
  [ERROR_CODE.PAY_SIGN_FAILED]: 'Signature verification failed',
  [ERROR_CODE.PAY_CHANNEL_ERROR]: 'Payment channel error',
  [ERROR_CODE.PAY_AMOUNT_MISMATCH]: 'Amount mismatch',
  [ERROR_CODE.PAY_NOTIFY_FAILED]: 'Payment callback failed',

  [ERROR_CODE.CONTENT_MODERATION]: 'Content moderation flagged',
  [ERROR_CODE.PUBLISH_VALIDATION]: 'Publish validation failed',
  [ERROR_CODE.VALIDATION_ERROR]: 'Validation failed',
  [ERROR_CODE.CONFLICT]: 'Resource conflict',

  [ERROR_CODE.AI_INFER_FAILED]: 'AI inference failed',
  [ERROR_CODE.AI_TIMEOUT]: 'AI inference timeout',

  [ERROR_CODE.EC_AUTH_003]: 'Admin role required',
  [ERROR_CODE.EC_AUTH_004]: 'Editor role or higher required',
  [ERROR_CODE.EC_AUTH_005]: 'Super admin role required',
  [ERROR_CODE.EC_AUTH_006]: 'Enterprise users only',
  [ERROR_CODE.EC_AUTH_007]: 'Consumer users only',
  [ERROR_CODE.EC_AUTH_008]: 'Agent users only',
  [ERROR_CODE.EC_AUTH_009]: 'No valid auth token provided',
  [ERROR_CODE.EC_AUTH_010]: 'Token revoked (blacklisted)',

  [ERROR_CODE.EC_CSRF_001]: 'CSRF token missing',
  [ERROR_CODE.EC_CSRF_002]: 'CSRF token mismatch',

  [ERROR_CODE.EC_RATE_CONCURRENCY]: 'Too many concurrent requests',
  [ERROR_CODE.EC_RATE_GENERAL]: 'Too many requests',
  [ERROR_CODE.EC_RATE_AUTH]: 'Too many auth attempts',
  [ERROR_CODE.EC_RATE_CODE]: 'Verification code already sent',
  [ERROR_CODE.EC_RATE_VERIFY]: 'Too many verification attempts',
  [ERROR_CODE.EC_RATE_HEAVY]: 'Too many AI generation requests',
  [ERROR_CODE.EC_RATE_UPLOAD]: 'Too many upload requests',
  [ERROR_CODE.EC_RATE_PAYMENT]: 'Too many payment requests',
  [ERROR_CODE.EC_RATE_ADMIN]: 'Too many admin operations',
  [ERROR_CODE.EC_RATE_E2B]: 'Too many sandbox create requests',
  [ERROR_CODE.EC_RATE_E2B_EXEC]: 'Too many code execution requests',
  [ERROR_CODE.EC_RATE_E2B_READ]: 'Too many read requests',
  [ERROR_CODE.EC_RATE_E2B_DELETE]: 'Too many delete requests',
};

/**
 * FRONTEND_I18N_KEY — 前端 i18n 键值映射表。
 * key = error_code, value = i18n key path (相对于 common.error_codes)
 * 前端 useApi.ts 拦截器读取此表将错误码翻译为本地化消息。
 */
export const FRONTEND_I18N_KEY = {
  [ERROR_CODE.BAD_REQUEST]: 'bad_request',
  [ERROR_CODE.UNAUTHORIZED]: 'unauthorized',
  [ERROR_CODE.PAYMENT_REQUIRED]: 'payment_required',
  [ERROR_CODE.FORBIDDEN]: 'forbidden',
  [ERROR_CODE.NOT_FOUND]: 'not_found',
  [ERROR_CODE.INTERNAL_ERROR]: 'internal_error',

  [ERROR_CODE.USER_EXISTS]: 'user_exists',
  [ERROR_CODE.USER_NOT_FOUND]: 'user_not_found',
  [ERROR_CODE.PASSWORD_WRONG]: 'password_wrong',
  [ERROR_CODE.TOKEN_EXPIRED]: 'token_expired',
  [ERROR_CODE.TOKEN_INVALID]: 'token_invalid',
  [ERROR_CODE.ACCOUNT_DISABLED]: 'account_disabled',
  [ERROR_CODE.EC_AUTH_002]: 'token_expired',
  [ERROR_CODE.REFRESH_TOKEN_EXPIRED]: 'refresh_token_expired',
  [ERROR_CODE.REFRESH_TOKEN_INVALID]: 'refresh_token_invalid',

  [ERROR_CODE.RESOURCE_NOT_FOUND]: 'not_found',
  [ERROR_CODE.RESOURCE_DUPLICATE]: 'resource_duplicate',
  [ERROR_CODE.QUOTA_EXCEEDED]: 'quota_exceeded',

  [ERROR_CODE.PARAM_MISSING]: 'param_missing',
  [ERROR_CODE.PARAM_INVALID]: 'param_invalid',
  [ERROR_CODE.PARAM_ERROR]: 'param_error',

  [ERROR_CODE.PAY_ORDER_NOT_FOUND]: 'order_not_found',
  [ERROR_CODE.PAY_ORDER_EXPIRED]: 'order_expired',
  [ERROR_CODE.PAY_SIGN_FAILED]: 'sign_failed',
  [ERROR_CODE.PAY_CHANNEL_ERROR]: 'channel_error',
  [ERROR_CODE.PAY_AMOUNT_MISMATCH]: 'amount_mismatch',
  [ERROR_CODE.PAY_NOTIFY_FAILED]: 'callback_failed',

  [ERROR_CODE.CONTENT_MODERATION]: 'content_moderation',
  [ERROR_CODE.PUBLISH_VALIDATION]: 'publish_validation',
  [ERROR_CODE.VALIDATION_ERROR]: 'validation_error',
  [ERROR_CODE.CONFLICT]: 'conflict',

  [ERROR_CODE.AI_INFER_FAILED]: 'ai_infer_failed',
  [ERROR_CODE.AI_TIMEOUT]: 'ai_timeout',

  [ERROR_CODE.EC_AUTH_003]: 'admin_required',
  [ERROR_CODE.EC_AUTH_004]: 'editor_required',
  [ERROR_CODE.EC_AUTH_005]: 'super_admin_required',
  [ERROR_CODE.EC_AUTH_006]: 'enterprise_only',
  [ERROR_CODE.EC_AUTH_007]: 'consumer_only',
  [ERROR_CODE.EC_AUTH_008]: 'agent_only',
  [ERROR_CODE.EC_AUTH_009]: 'no_token',
  [ERROR_CODE.EC_AUTH_010]: 'token_revoked',

  [ERROR_CODE.EC_CSRF_001]: 'csrf_missing',
  [ERROR_CODE.EC_CSRF_002]: 'csrf_mismatch',

  [ERROR_CODE.EC_RATE_CONCURRENCY]: 'concurrency',
  [ERROR_CODE.EC_RATE_GENERAL]: 'general',
  [ERROR_CODE.EC_RATE_AUTH]: 'auth',
  [ERROR_CODE.EC_RATE_CODE]: 'code',
  [ERROR_CODE.EC_RATE_VERIFY]: 'verify',
  [ERROR_CODE.EC_RATE_HEAVY]: 'heavy',
  [ERROR_CODE.EC_RATE_UPLOAD]: 'upload',
  [ERROR_CODE.EC_RATE_PAYMENT]: 'payment',
  [ERROR_CODE.EC_RATE_ADMIN]: 'admin',
  [ERROR_CODE.EC_RATE_E2B]: 'e2b',
  [ERROR_CODE.EC_RATE_E2B_EXEC]: 'e2b_exec',
  [ERROR_CODE.EC_RATE_E2B_READ]: 'e2b_read',
  [ERROR_CODE.EC_RATE_E2B_DELETE]: 'e2b_delete',
};
