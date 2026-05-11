/**
 * Movio AI — Auth Middleware (Re-export)
 *
 * 本文件为兼容性重导出，所有认证逻辑统一在 auth.js 中维护。
 * 旧导入路径 `../middleware/auth.middleware.js` 无需修改即可继续使用。
 */
export { authMiddleware, enterpriseOnly, consumerOnly } from './auth.js';
