import { AsyncLocalStorage } from 'async_hooks';

export const als = new AsyncLocalStorage();

/**
 * 获取当前请求上下文的 DB 句柄（租户隔离）
 * 在请求生命周期内返回 TenantPool，否则回退到 default pool
 */
export function getContextDB(defaultPool) {
  const store = als.getStore();
  return store?.db || defaultPool;
}
