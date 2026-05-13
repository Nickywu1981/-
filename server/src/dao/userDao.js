import pool from './db.js';
import { paginationSQL } from '../utils/pagination.js';

export async function insertUser({ username, password, nickname = '', tenantId: _t = 0 }, conn) {
  const db = conn || pool;
  const [result] = await db.execute(
    'INSERT INTO users (phone, email, password_hash, nickname, role, status) VALUES (?, ?, ?, ?, \'free\', \'active\')',
    [username || '', '', password, nickname || username || ''],
  );
  return result.insertId;
}

export async function createUser({ phone, email, password, nickname }, conn) {
  const db = conn || pool;
  const [result] = await db.execute(
    'INSERT INTO users (phone, email, password_hash, nickname, role, status) VALUES (?, ?, ?, ?, \'free\', \'active\')',
    [phone || '', email || '', password, nickname || ''],
  );
  return result.insertId;
}

export async function findByUsername(username) {
  // Match by phone, email, or nickname (username field maps loosely)
  const isPhone = /^1[3-9]\d{9}$/.test(username);
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username);
  let field = 'nickname';
  if (isPhone) field = 'phone';
  else if (isEmail) field = 'email';

  const ALLOWED_FIELDS = ['phone', 'email', 'nickname'];
  if (!ALLOWED_FIELDS.includes(field)) field = 'nickname';

  const [rows] = await pool.execute(
    `SELECT id, nickname AS username, password_hash AS password, nickname, phone, email, avatar_url AS avatar, role, status, last_login_at AS last_login_time, created_at AS create_time, updated_at AS update_time FROM users WHERE ${field} = ? AND status != 'deleted' LIMIT 1`,
    [username],
  );
  return rows[0] || null;
}

export async function findById(id) {
  const [rows] = await pool.execute(
    'SELECT id, nickname AS username, nickname, phone, email, avatar_url AS avatar, role, status, last_login_at AS last_login_time, created_at AS create_time, updated_at AS update_time FROM users WHERE id = ? AND status != \'deleted\' LIMIT 1',
    [id],
  );
  return rows[0] || null;
}

export async function findPhoneById(id) {
  const [[row]] = await pool.execute(
    'SELECT phone FROM users WHERE id = ? AND phone IS NOT NULL AND phone != \'\'',
    [id],
  );
  return row || null;
}

export async function countUsers(keyword = '') {
  const sql = keyword
    ? 'SELECT COUNT(*) AS total FROM users WHERE status != \'deleted\' AND (nickname LIKE ? OR phone LIKE ? OR email LIKE ?)'
    : 'SELECT COUNT(*) AS total FROM users WHERE status != \'deleted\'';
  const params = keyword ? [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`] : [];
  const [rows] = await pool.execute(sql, params);
  return rows[0].total;
}

export async function listUsers(pager, keyword = '') {
  let sql = 'SELECT id, nickname AS username, nickname, avatar_url AS avatar, role, status, last_login_at AS last_login_time, created_at AS create_time FROM users WHERE status != \'deleted\'';
  const params = [];
  if (keyword) {
    sql += ' AND (nickname LIKE ? OR phone LIKE ? OR email LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  const { sql: pageSQL, params: pageParams } = paginationSQL(pager);
  sql += ` ${pageSQL}`;
  params.push(...pageParams);
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function updateLastLogin(id) {
  const [r] = await pool.execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [id]);
  return r.affectedRows;
}

export async function updateUser(id, fields) {
  const sets = [];
  const params = [];
  for (const [k, v] of Object.entries(fields)) {
    // Map old field names to new schema
    const fieldMap = { avatar: 'avatar_url' };
    const col = fieldMap[k] || k;
    if (['nickname', 'phone', 'email', 'avatar_url', 'role'].includes(col)) {
      sets.push(`${col} = ?`);
      params.push(v);
    }
  }
  if (sets.length === 0) return 0;
  params.push(id);
  const [r] = await pool.execute(`UPDATE users SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ?`, params);
  return r.affectedRows;
}

export async function updatePassword(id, hashedPassword) {
  const [r] = await pool.execute('UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?', [hashedPassword, id]);
  return r.affectedRows;
}

export async function findByPhone(phone) {
  const [rows] = await pool.execute(
    'SELECT id, nickname AS username, nickname, phone, email, password_hash AS password, role, status, last_login_at AS last_login_time, created_at AS create_time, updated_at AS update_time FROM users WHERE phone = ? AND status != \'deleted\' LIMIT 1',
    [phone],
  );
  return rows[0] || null;
}

export async function findByEmail(email) {
  const [rows] = await pool.execute(
    'SELECT id, nickname AS username, nickname, email FROM users WHERE email = ? AND status != \'deleted\' LIMIT 1',
    [email],
  );
  return rows[0] || null;
}

export async function getUserStats(userId) {
  const [[{ taskTotal }], [{ todayTotal }], [{ creditUsed }]] = await Promise.all([
    pool.execute('SELECT COUNT(*) AS taskTotal FROM job_queue WHERE user_id = ?', [userId]),
    pool.execute('SELECT COUNT(*) AS todayTotal FROM job_queue WHERE user_id = ? AND DATE(created_at) = CURDATE()', [userId]),
    pool.execute(
      'SELECT COALESCE(SUM(consumed), 0) AS creditUsed FROM consumption_record WHERE user_id = ? AND DATE_FORMAT(create_time, \'%Y-%m\') = DATE_FORMAT(CURDATE(), \'%Y-%m\')',
      [userId],
    ),
  ]);
  return { todayTasks: todayTotal, totalTasks: taskTotal, thisMonthConsumed: creditUsed };
}
