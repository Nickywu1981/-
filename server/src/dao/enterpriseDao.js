/**
 * Enterprise DAO — 企业/代理端数据访问层
 *
 * Phase 1: 企业/代理端 MVP (2026-05-11)
 */
import pool from './db.js';
import { parsePagination } from '../utils/pagination.js';

const TABLE = {
  TENANT: 'tenant',
  ENTERPRISE_USER: 'enterprise_user',
};

// ==================== 企业/租户 CRUD ====================

export async function findTenantById(id, conn, forUpdate = false) {
  const db = conn || pool;
  const lock = forUpdate ? ' FOR UPDATE' : '';
  const [rows] = await db.query(`SELECT * FROM ?? WHERE id = ? AND status = 1 LIMIT 1${lock}`, [TABLE.TENANT, id]);
  return rows[0] || null;
}

export async function findTenantByCode(code) {
  const [rows] = await pool.query('SELECT * FROM ?? WHERE code = ? AND status = 1 LIMIT 1', [TABLE.TENANT, code]);
  return rows[0] || null;
}

export async function findTenantByDomain(domain) {
  const [rows] = await pool.query(
    'SELECT * FROM ?? WHERE JSON_EXTRACT(white_label, "$.domain") = ? AND status = 1 LIMIT 1',
    [TABLE.TENANT, domain],
  );
  return rows[0] || null;
}

export async function createTenant(data, conn) {
  const db = conn || pool;
  const [result] = await db.query('INSERT INTO ?? SET ?', [TABLE.TENANT, {
    name: data.name,
    code: data.code,
    type: data.type || 'enterprise',
    parent_tenant_id: data.parentTenantId || null,
    logo: data.logo || '',
    domain: data.domain || '',
    white_label: data.whiteLabel ? JSON.stringify(data.whiteLabel) : null,
    plan_type: data.planType || 'free',
    status: 1,
    review_status: 'pending',
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
  const { offset } = parsePagination({ page, pageSize });
  const [rows] = await pool.query(`SELECT * FROM ?? WHERE ${where} ORDER BY create_time DESC LIMIT ? OFFSET ?`, [TABLE.TENANT, ...params, pageSize, offset]);
  return { list: rows, total, page, pageSize };
}

// ==================== 企业子账号 CRUD ====================

export async function findEnterpriseUser(tenantId, userId) {
  const [rows] = await pool.query(
    'SELECT * FROM ?? WHERE tenant_id = ? AND user_id = ? AND is_deleted = 0 LIMIT 1',
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
  const { offset } = parsePagination({ page, pageSize });
  const [rows] = await pool.query(
    `SELECT eu.*, u.nickname, u.phone, u.email FROM ?? eu LEFT JOIN user u ON eu.user_id = u.id WHERE ${where} ORDER BY eu.create_time DESC LIMIT ? OFFSET ?`,
    [TABLE.ENTERPRISE_USER, ...params, pageSize, offset],
  );
  return { list: rows, total, page, pageSize };
}

export async function addEnterpriseUser(data, conn) {
  const db = conn || pool;
  const [result] = await db.query('INSERT INTO ?? SET ?', [TABLE.ENTERPRISE_USER, {
    tenant_id: data.tenantId,
    user_id: data.userId,
    role: data.role || 'enterprise_operator',
    permissions: data.permissions ? JSON.stringify(data.permissions) : null,
    status: data.status !== undefined ? data.status : 1,
  }]);
  return result.insertId;
}

export async function updateEnterpriseUser(id, tenantId, data) {
  const fields = {};
  if (data.role !== undefined) fields.role = data.role;
  if (data.permissions !== undefined) fields.permissions = JSON.stringify(data.permissions);
  if (data.status !== undefined) fields.status = data.status;
  if (Object.keys(fields).length === 0) return 0;
  const [result] = await pool.query('UPDATE ?? SET ? WHERE id = ? AND tenant_id = ? AND is_deleted = 0', [TABLE.ENTERPRISE_USER, fields, id, tenantId]);
  return result.affectedRows;
}

export async function removeEnterpriseUser(id, tenantId) {
  const [result] = await pool.query('UPDATE ?? SET is_deleted = 1 WHERE id = ? AND tenant_id = ?', [TABLE.ENTERPRISE_USER, id, tenantId]);
  return result.affectedRows;
}

export async function countEnterpriseUsers(tenantId) {
  const [rows] = await pool.query('SELECT COUNT(*) AS total FROM ?? WHERE tenant_id = ? AND is_deleted = 0 AND status = 1', [TABLE.ENTERPRISE_USER, tenantId]);
  return rows[0].total;
}

// ==================== 审批状态机 ====================

export async function listTenantsByReviewStatus(status, { page = 1, pageSize = 20, type, keyword } = {}) {
  const conditions = ['review_status = ?'];
  const params = [status];
  if (type) { conditions.push('type = ?'); params.push(type); }
  if (keyword) { conditions.push('(name LIKE ? OR code LIKE ? OR contact_name LIKE ?)'); params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`); }
  const where = conditions.join(' AND ');
  const [countResult] = await pool.query(`SELECT COUNT(*) AS total FROM ?? WHERE ${where}`, [TABLE.TENANT, ...params]);
  const total = countResult[0].total;
  const { offset } = parsePagination({ page, pageSize });
  const [rows] = await pool.query(`SELECT * FROM ?? WHERE ${where} ORDER BY create_time DESC LIMIT ? OFFSET ?`, [TABLE.TENANT, ...params, pageSize, offset]);
  return { list: rows, total, page, pageSize };
}

export async function updateTenantReviewStatus(id, { status, approvedBy, reason, reviewedAt }, conn) {
  const db = conn || pool;
  const fields = { review_status: status, reviewed_at: reviewedAt || new Date() };
  if (status === 'approved') {
    fields.approved_at = new Date();
    fields.approved_by = approvedBy;
  }
  if (status === 'rejected' || reason) {
    fields.review_remark = reason || null;
  }
  const [result] = await pool.query('UPDATE ?? SET ? WHERE id = ?', [TABLE.TENANT, fields, id]);
  return result.affectedRows;
}

export async function insertApprovalLog(data, conn) {
  const db = conn || pool;
  const [result] = await pool.query('INSERT INTO enterprise_approval_log SET ?', {
    tenant_id: data.tenantId,
    action: data.action,
    operator_id: data.operatorId,
    old_status: data.oldStatus || null,
    new_status: data.newStatus,
    reason: data.reason || null,
  });
  return result.insertId;
}

export async function getApprovalLogs(tenantId, { page = 1, pageSize = 20 } = {}) {
  const { offset } = parsePagination({ page, pageSize });
  const [rows] = await pool.query(
    `SELECT eal.*, u.nickname AS operator_name
     FROM enterprise_approval_log eal
     LEFT JOIN user u ON eal.operator_id = u.id
     WHERE eal.tenant_id = ?
     ORDER BY eal.create_time DESC LIMIT ? OFFSET ?`,
    [tenantId, pageSize, offset],
  );
  const [countResult] = await pool.query(
    'SELECT COUNT(*) AS total FROM enterprise_approval_log WHERE tenant_id = ?',
    [tenantId],
  );
  return { list: rows, total: countResult[0].total, page, pageSize };
}

export async function updateQualificationDocs(id, docs) {
  const [result] = await pool.query('UPDATE ?? SET qualification_docs = ? WHERE id = ?', [TABLE.TENANT, JSON.stringify(docs), id]);
  return result.affectedRows;
}

export async function getApprovalStats() {
  const [rows] = await pool.query(
    `SELECT review_status, COUNT(*) AS count
     FROM ?? WHERE status = 1
     GROUP BY review_status`,
    [TABLE.TENANT],
  );
  const stats = { pending: 0, approved: 0, rejected: 0, under_review: 0 };
  for (const r of rows) stats[r.review_status] = r.count;
  return stats;
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
