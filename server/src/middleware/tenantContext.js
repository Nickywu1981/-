/**
 * Tenant isolation middleware.
 * 作为 auth 中间件之后的补充：
 * 1. 如果 auth 未注入 tenantId，补默认值 tenantId=0
 * 2. 将 tenantId 绑定到 AsyncLocalStorage，使所有 DAO 自动获得租户隔离
 *
 * Phase 1 P0 修复：ALS 多租户透明隔离 (2026-05-08)
 */
import { als } from '../dao/context.js';
import { tenantPool } from '../dao/tenantPool.js';

export default function tenantContext(req, _res, next) {
  if (req.tenantId === undefined) {
    req.tenantId = req.user?.entId || req.user?.tenantId || 0;
  }

  // 为当前请求创建租户感知的 DB 句柄，存入 ALS
  const tp = req.tenantId > 0 ? tenantPool(req) : null;
  als.run({ db: tp, tenantId: req.tenantId }, () => {
    next();
  });
}
