/**
 * Open API Key DAO — open_api_key 表数据访问
 * G5 后端 | G6 数据库 | 阶段4
 */
import pool from './db.js';

const TABLE = 'open_api_key';
const KEY_COLS = ['api_key', 'description', 'status', 'rate_limit', 'daily_limit', 'tenant_id'];

function clean(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) { if (v !== undefined) out[k] = v; }
  return out;
}

function pickAllowed(data) {
  const out = {};
  for (const k of KEY_COLS) { if (data[k] !== undefined) out[k] = data[k]; }
  return out;
}

export async function listByTenant(tenantId, opts = {}) {
  const { page = 1, pageSize = 20 } = opts;
  const offset = (page - 1) * pageSize;
  const [rows] = await pool.query(
    `SELECT id, api_key, description, status, rate_limit, daily_limit, create_time, update_time
     FROM ${TABLE} WHERE tenant_id = ? AND is_deleted = 0 ORDER BY create_time DESC LIMIT ? OFFSET ?`,
    [tenantId, pageSize, offset],
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM ${TABLE} WHERE tenant_id = ? AND is_deleted = 0`,
    [tenantId],
  );
  return { rows, total, page, pageSize };
}

export async function getById(id, tenantId) {
  const [rows] = await pool.query(
    `SELECT * FROM ${TABLE} WHERE id = ? AND tenant_id = ? AND is_deleted = 0 LIMIT 1`,
    [id, tenantId],
  );
  return rows?.[0] || null;
}

export async function getByApiKey(apiKey) {
  const [rows] = await pool.query(
    `SELECT * FROM ${TABLE} WHERE api_key = ? AND is_deleted = 0 LIMIT 1`,
    [apiKey],
  );
  return rows?.[0] || null;
}

export async function create(data) {
  const [result] = await pool.query(`INSERT INTO ${TABLE} SET ?`, pickAllowed(clean(data)));
  return result.insertId;
}

export async function update(id, tenantId, data) {
  const [result] = await pool.query(
    `UPDATE ${TABLE} SET ? WHERE id = ? AND tenant_id = ? AND is_deleted = 0`,
    [pickAllowed(clean(data)), id, tenantId],
  );
  return result.affectedRows > 0;
}

export async function softDelete(id, tenantId) {
  const [result] = await pool.query(
    `UPDATE ${TABLE} SET is_deleted = 1 WHERE id = ? AND tenant_id = ?`,
    [id, tenantId],
  );
  return result.affectedRows > 0;
}

export default { listByTenant, getById, getByApiKey, create, update, softDelete };
