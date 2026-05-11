/**
 * Enterprise DAO — 企业/代理端数据访问层
 *
 * Phase 1: 企业/代理端 MVP (2026-05-11)
 */
import pool from '../dao/db.js';

const TABLE = {
  TENANT: 'tenant',
  ENTERPRISE_USER: 'enterprise_user',
};

// ==================== 企业/租户 CRUD ====================

export async function findTenantById(id) {
  const [rows] = await pool.query('SELECT * FROM ?? WHERE id = ? AND status = 1', [TABLE.TENANT, id]);
  return rows[0] || null;
}

export async function findTenantByCode(code) {
  const [rows] = await pool.query('SELECT * FROM ?? WHERE code = ? AND status = 1', [TABLE.TENANT, code]);
  return rows[0] || null;
}

export async function findTenantByDomain(domain) {
  const [rows] = await pool.query(
    'SELECT * FROM ?? WHERE JSON_EXTRACT(white_label, "$.domain") = ? AND status = 1',
    [TABLE.TENANT, domain],
  );
  return rows[0] || null;
}

export async function createTenant(data) {
  const [result] = await pool.query('INSERT INTO ?? SET ?', [TABLE.TENANT, {
    name: data.name,
    code: data.code,
    type: data.type || 'enterprise',
    parent_tenant_id: data.parentTenantId || null,
    logo: data.logo || '',
    domain: data.domain || '',
    white_label: data.whiteLabel ? JSON.stringify(data.whiteLabel) : null,
    plan_type: data.planType || 'free',
    status: 1,
    contact_name: data.contactName || '',
    contact_phone: data.contactPhone || '',
    contact_email: data.contactEmail || '',
    max_users: data.maxUsers || 5,
    quota_images: data.quotaImages || 100,
    quota_video: data.quotaVideo || 10,
    balance: data.balance || 0,
    commission_rate: data.commissionRate || 10,
    expire_time: data.expireTime || null,
  }]);
  return result.insertId;
}

export async function updateTenant(id, data) {
  const fields = {};
  const allowed = ['name', 'logo', 'domain', 'white_label', 'plan_type', 'status',
    'contact_name', 'contact_phone', 'contact_email', 'address',
    'max_users', 'quota_images', 'quota_video', 'balance', 'commission_rate', 'expire_time'];
  for (const key of allowed) {
    if (data[key] !== undefined) {
      fields[key] = key === 'white_label' && typeof data[key] === 'object'
        ? JSON.stringify(data[key]) : data[key];
    }
  }
  if (Object.keys(fields).length === 0) return 0;
  const [result] = await pool.query('UPDATE ?? SET ? WHERE id = ?', [TABLE.TENANT, fields, id]);
  return result.affectedRows;
}

export async function listTenants({ page = 1, pageSize = 20, type, status, keyword }) {
  const conditions = ['1=1'];
  const params = [];
  if (type) { conditions.push('type = ?'); params.push(type); }
  if (status !== undefined) { conditions.push('status = ?'); params.push(status); }
  if (keyword) { conditions.push('(name LIKE ? OR code LIKE ? OR contact_name LIKE ?)'); params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`); }
  const where = conditions.join(' AND ');
  const [countResult] = await pool.query(`SELECT COUNT(*) AS total FROM ?? WHERE ${where}`, [TABLE.TENANT, ...params]);
  const total = countResult[0].total;
  const offset = (page - 1) * pageSize;
  const [rows] = await pool.query(`SELECT * FROM ?? WHERE ${where} ORDER BY create_time DESC LIMIT ? OFFSET ?`, [TABLE.TENANT, ...params, pageSize, offset]);
  return { list: rows, total, page, pageSize };
}

// ==================== 企业子账号 CRUD ====================

export async function findEnterpriseUser(tenantId, userId) {
  const [rows] = await pool.query(
    'SELECT * FROM ?? WHERE tenant_id = ? AND user_id = ? AND is_deleted = 0',
    [TABLE.ENTERPRISE_USER, tenantId, userId],
  );
  return rows[0] || null;
}

export async function findEnterpriseUserByUserId(userId) {
  const [rows] = await pool.query(
    'SELECT * FROM ?? WHERE user_id = ? AND is_deleted = 0 LIMIT 1',
    [TABLE.ENTERPRISE_USER, userId],
  );
  return rows[0] || null;
}

export async function listEnterpriseUsers(tenantId, { page = 1, pageSize = 20, status, keyword } = {}) {
  const conditions = ['tenant_id = ?', 'is_deleted = 0'];
  const params = [tenantId];
  if (status !== undefined) { conditions.push('status = ?'); params.push(status); }
  if (keyword) {
    conditions.push('user_id IN (SELECT id FROM user WHERE nickname LIKE ? OR phone LIKE ? OR email LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  const where = conditions.join(' AND ');
  const [countResult] = await pool.query(`SELECT COUNT(*) AS total FROM ?? WHERE ${where}`, [TABLE.ENTERPRISE_USER, ...params]);
  const total = countResult[0].total;
  const offset = (page - 1) * pageSize;
  const [rows] = await pool.query(
    `SELECT eu.*, u.nickname, u.phone, u.email FROM ?? eu LEFT JOIN user u ON eu.user_id = u.id WHERE ${where} ORDER BY eu.create_time DESC LIMIT ? OFFSET ?`,
    [TABLE.ENTERPRISE_USER, ...params, pageSize, offset],
  );
  return { list: rows, total, page, pageSize };
}

export async function addEnterpriseUser(data) {
  const [result] = await pool.query('INSERT INTO ?? SET ?', [TABLE.ENTERPRISE_USER, {
    tenant_id: data.tenantId,
    user_id: data.userId,
    role: data.role || 'enterprise_operator',
    permissions: data.permissions ? JSON.stringify(data.permissions) : null,
    status: data.status !== undefined ? data.status : 1,
  }]);
  return result.insertId;
}

export async function updateEnterpriseUser(id, data) {
  const fields = {};
  if (data.role !== undefined) fields.role = data.role;
  if (data.permissions !== undefined) fields.permissions = JSON.stringify(data.permissions);
  if (data.status !== undefined) fields.status = data.status;
  if (Object.keys(fields).length === 0) return 0;
  const [result] = await pool.query('UPDATE ?? SET ? WHERE id = ? AND is_deleted = 0', [TABLE.ENTERPRISE_USER, fields, id]);
  return result.affectedRows;
}

export async function removeEnterpriseUser(id) {
  const [result] = await pool.query('UPDATE ?? SET is_deleted = 1 WHERE id = ?', [TABLE.ENTERPRISE_USER, id]);
  return result.affectedRows;
}

export async function countEnterpriseUsers(tenantId) {
  const [rows] = await pool.query('SELECT COUNT(*) AS total FROM ?? WHERE tenant_id = ? AND is_deleted = 0 AND status = 1', [TABLE.ENTERPRISE_USER, tenantId]);
  return rows[0].total;
}

// ==================== 用量查询 ====================

export async function getEnterpriseUsage(tenantId, { startDate, endDate, userId } = {}) {
  const conditions = ['tenant_id = ?'];
  const params = [tenantId];
  if (startDate) { conditions.push('create_time >= ?'); params.push(startDate); }
  if (endDate) { conditions.push('create_time <= ?'); params.push(endDate); }
  if (userId) { conditions.push('user_id = ?'); params.push(userId); }
  const where = conditions.join(' AND ');

  const [rows] = await pool.query(
    `SELECT DATE(create_time) AS date, COUNT(*) AS call_count, SUM(credit_amount) AS total_credits
     FROM credit_request_log WHERE ${where}
     GROUP BY DATE(create_time) ORDER BY date DESC LIMIT 90`,
    params,
  );
  return rows;
}

export async function getEnterpriseUsageByUser(tenantId, { startDate, endDate } = {}) {
  const conditions = ['tenant_id = ?'];
  const params = [tenantId];
  if (startDate) { conditions.push('create_time >= ?'); params.push(startDate); }
  if (endDate) { conditions.push('create_time <= ?'); params.push(endDate); }
  const where = conditions.join(' AND ');

  const [rows] = await pool.query(
    `SELECT user_id, COUNT(*) AS call_count, SUM(credit_amount) AS total_credits
     FROM credit_request_log WHERE ${where}
     GROUP BY user_id ORDER BY total_credits DESC LIMIT 50`,
    params,
  );
  return rows;
}
