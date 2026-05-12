import pool from '../dao/db.js';
import { parsePagination } from '../utils/pagination.js';

const TABLE = {
  RELATION: 'channel_relation',
  POLICY: 'commission_policy',
  PERFORMANCE: 'channel_performance',
  TENANT: 'tenant',
};

// ==================== 租户查询 ====================

export async function findTenantByAgentCode(agentCode) {
  const [rows] = await pool.query(
    'SELECT id FROM ?? WHERE agent_code = ? AND status = 1 LIMIT 1',
    [TABLE.TENANT, agentCode],
  );
  return rows[0] || null;
}

// ==================== 渠道关系 ====================

export async function findRelationByPair(parentTenantId, childTenantId) {
  const [rows] = await pool.query(
    'SELECT id FROM ?? WHERE tenant_id = ? AND child_tenant_id = ?',
    [TABLE.RELATION, parentTenantId, childTenantId],
  );
  return rows[0] || null;
}

export async function findRelationsByTenant(tenantId, { page = 1, pageSize = 20, status } = {}) {
  const conditions = ['cr.tenant_id = ?'];
  const params = [tenantId];
  if (status) { conditions.push('cr.status = ?'); params.push(status); }

  const { offset } = parsePagination({ page, pageSize });
  const [rows] = await pool.query(
    `SELECT cr.*, t.name AS child_name, t.code AS child_code, t.logo AS child_logo,
            t.channel_level, t.contact_name, t.contact_phone
     FROM ?? cr JOIN ?? t ON cr.child_tenant_id = t.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY cr.created_at DESC LIMIT ? OFFSET ?`,
    [TABLE.RELATION, TABLE.TENANT, ...params, pageSize, offset],
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM ?? cr WHERE ${conditions.join(' AND ')}`,
    [TABLE.RELATION, ...params],
  );
  return { list: rows, total, page, pageSize };
}

export async function findRelationById(id) {
  const [rows] = await pool.query(
    `SELECT cr.*, t.name AS child_name, t.code AS child_code
     FROM ?? cr JOIN ?? t ON cr.child_tenant_id = t.id WHERE cr.id = ?`,
    [TABLE.RELATION, TABLE.TENANT, id],
  );
  return rows[0] || null;
}

export async function createRelation(data) {
  const [result] = await pool.query('INSERT INTO ?? SET ?', [TABLE.RELATION, {
    tenant_id: data.tenantId,
    child_tenant_id: data.childTenantId,
    level: data.level || 1,
    status: 'pending',
  }]);
  return result.insertId;
}

export async function auditRelation(id, tenantId, { status, auditRemark }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      'UPDATE ?? SET status = ?, audit_remark = ?, audited_at = NOW() WHERE id = ? AND tenant_id = ?',
      [TABLE.RELATION, status, auditRemark || '', id, tenantId],
    );
    if (result.affectedRows && status === 'active') {
      const rel = await findRelationById(id);
      if (rel) {
        await conn.query(
          'UPDATE ?? SET parent_channel_id = ?, channel_level = ? WHERE id = ?',
          [TABLE.TENANT, rel.tenant_id, rel.level, rel.child_tenant_id],
        );
      }
    }
    await conn.commit();
    return result.affectedRows;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function updateRelationStatus(id, tenantId, status) {
  const [result] = await pool.query('UPDATE ?? SET status = ? WHERE id = ? AND tenant_id = ?', [TABLE.RELATION, status, id, tenantId]);
  return result.affectedRows;
}

export async function findDownstreamAgents(tenantId, { limit = 200 } = {}) {
  const [rows] = await pool.query(
    `SELECT cr.*, t.name, t.code, t.channel_level
     FROM ?? cr JOIN ?? t ON cr.child_tenant_id = t.id
     WHERE cr.tenant_id = ? AND cr.status = 'active'
     ORDER BY cr.level ASC
     LIMIT ?`,
    [TABLE.RELATION, TABLE.TENANT, tenantId, limit],
  );
  return rows;
}

// ==================== 分润政策 ====================

export async function listPolicies(tenantId, { limit = 200 } = {}) {
  const [rows] = await pool.query(
    'SELECT * FROM ?? WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ?',
    [TABLE.POLICY, tenantId, limit],
  );
  return rows;
}

export async function getPolicyById(id, tenantId) {
  const [rows] = await pool.query('SELECT * FROM ?? WHERE id = ? AND tenant_id = ? LIMIT 1', [TABLE.POLICY, id, tenantId]);
  return rows[0] || null;
}

export async function createPolicy(data) {
  const [result] = await pool.query('INSERT INTO ?? SET ?', [TABLE.POLICY, {
    tenant_id: data.tenantId,
    name: data.name,
    target_level: data.targetLevel || 1,
    commission_rate: data.commissionRate,
    min_revenue: data.minRevenue || 0,
    max_cap: data.maxCap || null,
    product_types: data.productTypes ? JSON.stringify(data.productTypes) : null,
    settlement_cycle: data.settlementCycle || 'monthly',
    effective_from: data.effectiveFrom,
    effective_to: data.effectiveTo || null,
  }]);
  return result.insertId;
}

export async function updatePolicy(id, tenantId, data) {
  const fields = {};
  if (data.name !== undefined) fields.name = data.name;
  if (data.commissionRate !== undefined) fields.commission_rate = data.commissionRate;
  if (data.minRevenue !== undefined) fields.min_revenue = data.minRevenue;
  if (data.maxCap !== undefined) fields.max_cap = data.maxCap;
  if (data.settlementCycle !== undefined) fields.settlement_cycle = data.settlementCycle;
  if (data.status !== undefined) fields.status = data.status;
  if (data.effectiveFrom !== undefined) fields.effective_from = data.effectiveFrom;
  if (data.effectiveTo !== undefined) fields.effective_to = data.effectiveTo;
  if (Object.keys(fields).length === 0) return 0;
  const [result] = await pool.query('UPDATE ?? SET ? WHERE id = ? AND tenant_id = ?', [TABLE.POLICY, fields, id, tenantId]);
  return result.affectedRows;
}

// ==================== 渠道业绩 ====================

export async function getPerformance(tenantId, { startDate, endDate, childTenantId, page = 1, pageSize = 20 } = {}) {
  const conditions = ['cp.tenant_id = ?'];
  const params = [tenantId];
  if (startDate) { conditions.push('cp.stat_date >= ?'); params.push(startDate); }
  if (endDate) { conditions.push('cp.stat_date <= ?'); params.push(endDate); }
  if (childTenantId) { conditions.push('cp.child_tenant_id = ?'); params.push(childTenantId); }

  const { offset } = parsePagination({ page, pageSize });
  const [rows] = await pool.query(
    `SELECT cp.*, t.name AS child_name
     FROM ?? cp LEFT JOIN ?? t ON cp.child_tenant_id = t.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY cp.stat_date DESC LIMIT ? OFFSET ?`,
    [TABLE.PERFORMANCE, TABLE.TENANT, ...params, pageSize, offset],
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM ?? cp WHERE ${conditions.join(' AND ')}`,
    [TABLE.PERFORMANCE, ...params],
  );
  return { list: rows, total, page, pageSize };
}

export async function getPerformanceSummary(tenantId, startDate, endDate) {
  const [rows] = await pool.query(
    `SELECT COALESCE(SUM(order_count), 0) AS total_orders,
            COALESCE(SUM(order_amount), 0) AS total_amount,
            COALESCE(SUM(commission), 0) AS total_commission,
            COALESCE(SUM(new_customers), 0) AS total_new_customers,
            COALESCE(SUM(token_usage), 0) AS total_token_usage
     FROM ?? WHERE tenant_id = ? AND stat_date >= ? AND stat_date <= ?`,
    [TABLE.PERFORMANCE, tenantId, startDate, endDate],
  );
  return rows[0] || null;
}
