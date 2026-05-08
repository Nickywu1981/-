/**
 * DAO 多租户隔离 Wrapper
 *
 * 所有查询自动携带 tenant_id，业务层无需手动传参
 * 提供 pool.tenant(req) 获取当前租户绑定的查询句柄
 *
 * 使用方式：const db = tenantPool.wrap(req); 后续 db.query(sql, params) 自动注入 tenant_id
 */
import { realPool } from './db.js';

/**
 * 自动为 SELECT/UPDATE/DELETE SQL 的 WHERE 子句注入 tenant_id 过滤
 * @param {string} sql - 原始 SQL
 * @param {Array} params - 原始参数
 * @param {number} tenantId - 租户 ID
 * @returns {{ sql: string, params: Array }}
 */
function injectTenant(sql, params, tenantId) {
  const trimmed = sql.trim().toUpperCase();
  const hasWhere = /WHERE\s/i.test(sql);

  // SELECT / UPDATE / DELETE — 注入 AND tenant_id = ?
  if (/^(SELECT|UPDATE|DELETE)\b/i.test(trimmed) && !trimmed.startsWith('SELECT COUNT')) {
    if (hasWhere) {
      // 已有 WHERE — 插入 AND tenant_id = ?
      const idx = sql.indexOf(sql.match(/WHERE\s/i)[0]) + sql.match(/WHERE\s/i)[0].length;
      const before = sql.slice(0, idx);
      const after = sql.slice(idx);
      return {
        sql: `${before}tenant_id = ? AND ${after}`,
        params: [tenantId, ...params],
      };
    } else {
      // 无 WHERE — 按 SQL 结构插入
      const insertAfterMatch = sql.match(/FROM\s+\S+\s*(?:AS\s+\S+\s*)?/i);
      if (insertAfterMatch) {
        const idx = sql.indexOf(insertAfterMatch[0]) + insertAfterMatch[0].length;
        return {
          sql: `${sql.slice(0, idx)}WHERE tenant_id = ? ${sql.slice(idx)}`,
          params: [tenantId, ...params],
        };
      }
    }
  }

  // COUNT — 同样注入
  if (trimmed.startsWith('SELECT COUNT')) {
    if (hasWhere) {
      const idx = sql.indexOf(sql.match(/WHERE\s/i)[0]) + sql.match(/WHERE\s/i)[0].length;
      return {
        sql: `${sql.slice(0, idx)}tenant_id = ? AND ${sql.slice(idx)}`,
        params: [tenantId, ...params],
      };
    }
  }

  // INSERT — 自动添加 tenant_id 字段
  if (trimmed.startsWith('INSERT')) {
    const valuesIdx = sql.indexOf('VALUES');
    const beforeValues = sql.slice(0, valuesIdx);
    const afterValues = sql.slice(valuesIdx);

    if (beforeValues.includes('tenant_id')) {
      return { sql, params };
    }

    const parenIdx = beforeValues.lastIndexOf(')');
    const newSql = `${beforeValues.slice(0, parenIdx)}, tenant_id)${afterValues}`;

    // 找到 VALUES 后的第一个 ( 位置
    const valParenIdx = afterValues.indexOf('(') + 1;
    const newParams = [...params, tenantId];

    // 需要重新插入参数 — 直接修改 SQL 的占位符数量
    // INSERT INTO t (a, b) VALUES (?, ?) → INSERT INTO t (a, b, tenant_id) VALUES (?, ?, ?)
    return {
      sql: `${beforeValues.slice(0, parenIdx)}, tenant_id) VALUES (${params.map(() => '?').join(', ')}, ?)`,
      params: [...params, tenantId],
    };
  }

  return { sql, params };
}

/**
 * 创建租户感知的连接句柄
 */
class TenantPool {
  /**
   * @param {number} tenantId
   */
  constructor(tenantId) {
    this._tenantId = tenantId;
  }

  async execute(sql, params = []) {
    const { sql: newSql, params: newParams } = injectTenant(sql, params, this._tenantId);
    return realPool.execute(newSql, newParams);
  }

  async query(sql, params = []) {
    const { sql: newSql, params: newParams } = injectTenant(sql, params, this._tenantId);
    return realPool.query(newSql, newParams);
  }

  async getConnection() {
    const conn = await realPool.getConnection();
    const tenantId = this._tenantId;
    return {
      execute(sql, params = []) {
        const { sql: s, params: p } = injectTenant(sql, params, tenantId);
        return conn.execute(s, p);
      },
      query(sql, params = []) {
        const { sql: s, params: p } = injectTenant(sql, params, tenantId);
        return conn.query(s, p);
      },
      release: () => conn.release(),
      beginTransaction: () => conn.beginTransaction(),
      commit: () => conn.commit(),
      rollback: () => conn.rollback(),
    };
  }
}

/**
 * 根据 Express req 获取租户绑定的数据库句柄
 * @param {import('express').Request} req
 * @returns {TenantPool}
 */
export function tenantPool(req) {
  const tenantId = req.tenantId || 0;
  return new TenantPool(tenantId);
}

/**
 * 超级管理员用 — 不注入 tenant_id 的裸池（跨租户查询）
 */
export function adminPool() {
  return realPool;
}

export default { tenantPool, adminPool };
