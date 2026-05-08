import pool from '../dao/db.js';

export async function listAiLogs({ page = 1, pageSize = 20, type, status }) {
  const offset = (page - 1) * pageSize;
  let where = 'WHERE 1=1';
  const params = [];

  if (type) { where += ' AND type = ?'; params.push(type); }
  if (status) { where += ' AND status = ?'; params.push(status); }

  params.push(pageSize, offset);
  const [rows] = await pool.query(`SELECT * FROM ai_call_log ${where} ORDER BY id DESC LIMIT ? OFFSET ?`, params);
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM ai_call_log ${where}`, params);
  return { list: rows, total, page, pageSize };
}

export async function getStats() {
  const [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM ai_call_log');
  const [todayRows] = await pool.query('SELECT COUNT(*) as today FROM ai_call_log WHERE DATE(created_at) = CURDATE()');
  const [[{ totalCost }]] = await pool.query('SELECT COALESCE(SUM(cost), 0) as totalCost FROM ai_call_log');
  return { total, today: todayRows[0]?.today || 0, totalCost };
}
