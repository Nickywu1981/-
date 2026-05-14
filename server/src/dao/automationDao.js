import pool from './db.js';
import { parsePagination } from '../utils/pagination.js';

const TASK_COLS = 'at.id, at.tenant_id, at.user_id, at.account_id, at.task_type, at.task_config, at.status, at.start_time, at.end_time, at.result_json, at.screenshot_url, at.error_msg, at.create_time';

export async function listTasks(userId, tenantId, { page = 1, pageSize = 20 } = {}) {
  const { offset } = parsePagination({ page, pageSize });
  const [rows] = await pool.query(
    `SELECT ${TASK_COLS}, aa.platform, aa.store_name FROM automation_task at LEFT JOIN automation_account aa ON at.account_id = aa.id WHERE at.user_id = ? AND at.tenant_id = ? ORDER BY at.create_time DESC LIMIT ? OFFSET ?`,
    [userId, tenantId, pageSize, offset],
  );
  return rows;
}

export async function getTaskById(id, tenantId) {
  const params = [id];
  if (tenantId) { params.push(tenantId); }
  const [rows] = await pool.query(`SELECT ${TASK_COLS} FROM automation_task at WHERE at.id = ?${tenantId ? ' AND at.tenant_id = ?' : ''} LIMIT 1`, params);
  return rows[0] || null;
}

export async function createTask(data) {
  const [r] = await pool.query(
    'INSERT INTO automation_task (tenant_id, user_id, account_id, task_type, task_config) VALUES (?, ?, ?, ?, ?)',
    [data.tenantId, data.userId, data.accountId || null, data.taskType, data.taskConfig || null],
  );
  return r.insertId;
}

export async function updateTaskStatus(id, userId, tenantId, status, extra = {}) {
  const sets = ['status = ?'], vals = [status];
  if (extra.startTime) { sets.push('start_time = NOW()'); }
  if (extra.endTime) { sets.push('end_time = NOW()'); }
  if (extra.resultJson) { sets.push('result_json = ?'); vals.push(extra.resultJson); }
  if (extra.screenshotUrl) { sets.push('screenshot_url = ?'); vals.push(extra.screenshotUrl); }
  if (extra.errorMsg) { sets.push('error_msg = ?'); vals.push(extra.errorMsg); }
  vals.push(id, userId, tenantId);
  const [r] = await pool.query(`UPDATE automation_task SET ${sets.join(', ')} WHERE id = ? AND user_id = ? AND tenant_id = ?`, vals);
  return r.affectedRows;
}

export async function tryStartTask(id, userId, tenantId) {
  const [r] = await pool.query(
    'UPDATE automation_task SET status = 1, start_time = NOW() WHERE id = ? AND user_id = ? AND tenant_id = ? AND status = 0',
    [id, userId, tenantId],
  );
  return r.affectedRows;
}

export async function cancelTask(id, userId, tenantId) {
  const [r] = await pool.query('UPDATE automation_task SET status = 4 WHERE id = ? AND user_id = ? AND tenant_id = ? AND status IN (0, 1)', [id, userId, tenantId]);
  return r.affectedRows > 0;
}

// Account management
export async function listAccounts(userId, tenantId, { page = 1, pageSize = 20 } = {}) {
  const { offset } = parsePagination({ page, pageSize });
  const [rows] = await pool.query('SELECT id, platform, store_name, username, status, last_login, create_time FROM automation_account WHERE user_id = ? AND tenant_id = ? ORDER BY create_time DESC LIMIT ? OFFSET ?', [userId, tenantId, pageSize, offset]);
  return rows;
}

export async function createAccount(data) {
  const [r] = await pool.query(
    'INSERT INTO automation_account (tenant_id, user_id, platform, store_name, username, encrypted_password) VALUES (?, ?, ?, ?, ?, ?)',
    [data.tenantId, data.userId, data.platform, data.storeName || null, data.username, data.encryptedPassword],
  );
  return r.insertId;
}

export async function deleteAccount(id, userId, tenantId) {
  const [r] = await pool.query('DELETE FROM automation_account WHERE id = ? AND user_id = ? AND tenant_id = ?', [id, userId, tenantId]);
  return r.affectedRows;
}

// Admin: list all
export async function listAllTasks(limit = 200) {
  const [rows] = await pool.query(`SELECT ${TASK_COLS} FROM automation_task at ORDER BY at.create_time DESC LIMIT ?`, [limit]);
  return rows;
}
