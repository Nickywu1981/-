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
 * 有 tenant_id 列的表白名单
 * 只对这些表注入 tenant_id，其余表跳过
 */
const TENANT_TABLES = new Set([
  'diy_page', 'diy_component', 'diy_page_version',
  'custom_form', 'custom_form_submission',
  'api_proxy_config', 'recharge_order',
  'automation_account', 'automation_task',
  'prompt_template', 'prompt_group', 'prompt_favorite',
  'sensitive_word', 'user', 'credit_request_log', 'ai_call_log',
  'enterprise_user',
]);

/** 从 SQL 里提取表名 */
function extractTable(sql) {
  const m = sql.match(/(?:FROM|INTO|UPDATE)\s+`?(\w+)`?/i);
  return m ? m[1].toLowerCase() : null;
}

/** 判断是否需要对当前 SQL 注入 tenant_id */
function shouldInject(sql) {
  const table = extractTable(sql);
  if (!table) return false;
  return TENANT_TABLES.has(table);
}

/**
 * 自动为 SELECT/UPDATE/DELETE SQL 的 WHERE 子句注入 tenant_id 过滤
 * 仅对 TENANT_TABLES 白名单中的表生效
 */
function injectTenant(sql, params, tenantId) {
  if (!shouldInject(sql)) return { sql, params };

  const trimmed = sql.trim().toUpperCase();
  const hasWhere = /WHERE\s/i.test(sql);

  if (/^(SELECT|UPDATE|DELETE)\b/i.test(trimmed) && !trimmed.startsWith('SELECT COUNT')) {
    if (hasWhere) {
      const idx = sql.indexOf(sql.match(/WHERE\s/i)[0]) + sql.match(/WHERE\s/i)[0].length;
      return {
        sql: `${sql.slice(0, idx)}tenant_id = ? AND ${sql.slice(idx)}`,
        params: [tenantId, ...params],
      };
    } else {
      const m = sql.match(/FROM\s+\S+\s*(?:AS\s+\S+\s*)?/i);
      if (m) {
        const idx = sql.indexOf(m[0]) + m[0].length;
        return {
          sql: `${sql.slice(0, idx)}WHERE tenant_id = ? ${sql.slice(idx)}`,
          params: [tenantId, ...params],
        };
      }
    }
  }

  if (trimmed.startsWith('SELECT COUNT')) {
    if (hasWhere) {
      const idx = sql.indexOf(sql.match(/WHERE\s/i)[0]) + sql.match(/WHERE\s/i)[0].length;
      return {
        sql: `${sql.slice(0, idx)}tenant_id = ? AND ${sql.slice(idx)}`,
        params: [tenantId, ...params],
      };
    }
  }

  if (trimmed.startsWith('INSERT')) {
    const valuesIdx = sql.indexOf('VALUES');
    const beforeValues = sql.slice(0, valuesIdx);
    if (beforeValues.includes('tenant_id')) return { sql, params };
    const parenIdx = beforeValues.lastIndexOf(')');
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
  const tenantId = req?.tenantId || 0;
  return new TenantPool(tenantId);
}

/**
 * 超级管理员用 — 不注入 tenant_id 的裸池（跨租户查询）
 */
export function adminPool() {
  return realPool;
}
