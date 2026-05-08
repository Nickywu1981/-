/**
 * 多租户数据隔离工具
 *
 * 所有涉及租户数据的 DAO 查询必须使用此工具附加 tenant_id 过滤条件，
 * 防止跨租户数据泄露。
 *
 * 使用方式：
 *   import { withTenant, mustTenant } from '../utils/tenantFilter.js';
 *   const { sql, params } = withTenant('SELECT * FROM image WHERE status = 1', [status], tenantId, 'i');
 */
const TENANT_COLUMN = 'tenant_id';

/**
 * 为 SQL 查询附加租户过滤条件
 * @param {string}  baseSQL   - 已有 WHERE 子句的基础 SQL
 * @param {Array}   params    - 已有参数数组
 * @param {number}  tenantId  - 租户 ID
 * @param {string}  [alias]   - 表别名，如 'u'
 * @returns {{ sql: string, params: Array }}
 */
export function withTenant(baseSQL, params, tenantId, alias) {
  const col = alias ? `${alias}.${TENANT_COLUMN}` : TENANT_COLUMN;
  const hasWhere = /where/i.test(baseSQL);
  const clause = hasWhere
    ? ` AND ${col} = ?`
    : ` WHERE ${col} = ?`;
  return {
    sql: `${baseSQL}${clause}`,
    params: [...(params || []), tenantId],
  };
}

/**
 * 为 INSERT 语句附加 tenant_id 列
 * @param {string} baseSQL    - 'INSERT INTO t (a, b) VALUES (?, ?)'
 * @param {Array}  params     - [a, b]
 * @param {number} tenantId   - 租户 ID
 * @returns {{ sql: string, params: Array }}
 */
export function insertWithTenant(baseSQL, params, tenantId) {
  const hasValues = /VALUES\s*\(/i.test(baseSQL);
  if (!hasValues) return { sql: baseSQL, params };
  const newSQL = baseSQL.replace(
    /INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i,
    (_, table, cols, vals) =>
      `INSERT INTO ${table} (${cols}, ${TENANT_COLUMN}) VALUES (${vals}, ?)`,
  );
  return { sql: newSQL, params: [...(params || []), tenantId] };
}

/**
 * 要求 tenantId 必须存在且 > 0，否则返回 null
 * 用于超级管理员跨租户操作之外的常规业务
 */
export function mustTenant(tenantId) {
  if (!tenantId || tenantId <= 0) {
    return { error: 'tenant_id is required' };
  }
  return { error: null };
}

export default { withTenant, insertWithTenant, mustTenant };
