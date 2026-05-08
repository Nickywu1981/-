import pool from './db.js';

const table = 'abuse_records';

export async function countUserRecentCalls(userId, windowSeconds) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS cnt FROM ${table} WHERE user_id = ? AND create_time >= DATE_SUB(NOW(), INTERVAL ? SECOND)`,
    [userId, windowSeconds],
  );
  return rows[0].cnt;
}

export async function insertApiCall({ userId, apiPath, ip, userAgent }) {
  const [result] = await pool.execute(
    `INSERT INTO ${table} (user_id, api_path, ip, user_agent) VALUES (?, ?, ?, ?)`,
    [userId, apiPath, ip, userAgent],
  );
  return result.insertId;
}

export async function countIpRecentCalls(ip, windowSeconds) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS cnt FROM ${table} WHERE ip = ? AND create_time >= DATE_SUB(NOW(), INTERVAL ? SECOND)`,
    [ip, windowSeconds],
  );
  return rows[0].cnt;
}

export async function listAbuseRecords({ page = 1, pageSize = 20, userId } = {}) {
  const params = [];
  let where = 'WHERE 1=1';
  if (userId) { where += ' AND user_id = ?'; params.push(userId); }
  const [countResult] = await pool.execute(`SELECT COUNT(*) AS total FROM ${table} ${where}`, params);
  const total = countResult[0].total;
  const offset = (page - 1) * pageSize;
  const [rows] = await pool.execute(
    `SELECT * FROM ${table} ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return { list: rows, total, page, pageSize };
}

export default { countUserRecentCalls, insertApiCall, countIpRecentCalls, listAbuseRecords };
