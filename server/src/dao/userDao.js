import pool from './db.js';
import { paginationSQL } from '../utils/pagination.js';

export async function insertUser({ username, password, nickname = '', tenantId = 0 }) {
  const [result] = await pool.execute(
    'INSERT INTO user (username, password, nickname, tenant_id) VALUES (?, ?, ?, ?)',
    [username, password, nickname, tenantId],
  );
  return result.insertId;
}

export async function findByUsername(username) {
  const [rows] = await pool.execute(
    'SELECT id, username, password, nickname, phone, email, avatar, role, tenant_id, status, last_login_time, create_time, update_time FROM user WHERE username = ? AND is_deleted = 0 LIMIT 1',
    [username],
  );
  return rows[0] || null;
}

export async function findById(id) {
  const [rows] = await pool.execute(
    'SELECT id, username, nickname, phone, email, avatar, role, tenant_id, status, last_login_time, create_time, update_time FROM user WHERE id = ? AND is_deleted = 0 LIMIT 1',
    [id],
  );
  return rows[0] || null;
}

export async function countUsers(keyword = '') {
  const sql = keyword
    ? 'SELECT COUNT(*) AS total FROM user WHERE is_deleted = 0 AND (username LIKE ? OR nickname LIKE ?)'
    : 'SELECT COUNT(*) AS total FROM user WHERE is_deleted = 0';
  const params = keyword ? [`%${keyword}%`, `%${keyword}%`] : [];
  const [rows] = await pool.execute(sql, params);
  return rows[0].total;
}

export async function listUsers(pager, keyword = '') {
  let sql = 'SELECT id, username, nickname, avatar, role, status, last_login_time, create_time FROM user WHERE is_deleted = 0';
  const params = [];
  if (keyword) {
    sql += ' AND (username LIKE ? OR nickname LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  const { sql: pageSQL, params: pageParams } = paginationSQL(pager);
  sql += ` ${pageSQL}`;
  params.push(...pageParams);
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function updateLastLogin(id) {
  await pool.execute('UPDATE user SET last_login_time = NOW() WHERE id = ?', [id]);
}

export async function updateUser(id, fields) {
  const sets = [];
  const params = [];
  for (const [k, v] of Object.entries(fields)) {
    if (['nickname', 'phone', 'email', 'avatar'].includes(k)) {
      sets.push(`${k} = ?`);
      params.push(v);
    }
  }
  if (sets.length === 0) return;
  params.push(id);
  await pool.execute(`UPDATE user SET ${sets.join(', ')}, update_time = NOW() WHERE id = ?`, params);
}

export async function updatePassword(id, hashedPassword) {
  await pool.execute('UPDATE user SET password = ?, update_time = NOW() WHERE id = ?', [hashedPassword, id]);
}

export async function findByEmail(email) {
  const [rows] = await pool.execute(
    'SELECT id, username, nickname, email FROM user WHERE email = ? AND is_deleted = 0 LIMIT 1',
    [email],
  );
  return rows[0] || null;
}

export async function updateUserStatus(id, status) {
  await pool.execute('UPDATE user SET status = ?, update_time = NOW() WHERE id = ?', [status, id]);
}

export async function batchUpdateUserStatus(ids, status) {
  const placeholders = ids.map(() => '?').join(',');
  const [result] = await pool.execute(
    `UPDATE user SET status = ? WHERE id IN (${placeholders})`,
    [status, ...ids],
  );
  return result.affectedRows;
}

export async function getUserStats(userId) {
  const [[{ taskTotal }]] = await pool.execute(
    'SELECT COUNT(*) AS taskTotal FROM task WHERE user_id = ?',
    [userId],
  );
  const [[{ todayTotal }]] = await pool.execute(
    'SELECT COUNT(*) AS todayTotal FROM task WHERE user_id = ? AND DATE(create_time) = CURDATE()',
    [userId],
  );
  const [[{ creditUsed }]] = await pool.execute(
    `SELECT COALESCE(SUM(CASE WHEN action='freeze' THEN -credit_amount WHEN action='rollback' THEN credit_amount ELSE 0 END), 0) AS creditUsed
     FROM credit_request_log WHERE user_id = ? AND status = 1`,
    [userId],
  );
  return { taskTotal, todayTotal, creditUsed };
}
