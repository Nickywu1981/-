import pool from './db.js';

export async function insertHistory({ userId, type, inputs, outputs, modelId, tokenUsed, status = 'success', errorMsg = null }) {
  const [r] = await pool.execute(
    `INSERT INTO copywriting_history (user_id, type, inputs, outputs, model_id, token_used, status, error_msg)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, type, JSON.stringify(inputs), JSON.stringify(outputs), modelId, tokenUsed, status, errorMsg],
  );
  return r.insertId;
}

export async function listHistory({ userId, type, page = 1, pageSize = 20 }) {
  const offset = Math.max(0, (Number(page) - 1) * Number(pageSize));
  const hasType = type && type !== 'undefined';
  const where = hasType ? 'AND type = ?' : '';
  const bind = hasType ? [userId, type] : [userId];
  const [rows] = await pool.execute(
    `SELECT id, type, inputs, outputs, model_id, token_used, status, created_at FROM copywriting_history WHERE user_id = ? ${where} ORDER BY created_at DESC LIMIT ${Number(pageSize)} OFFSET ${offset}`,
    bind,
  );
  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM copywriting_history WHERE user_id = ? ${where}`,
    bind,
  );
  return { list: rows, total };
}

export async function getHistoryById(id) {
  const [rows] = await pool.execute('SELECT * FROM copywriting_history WHERE id = ?', [id]);
  return rows[0] || null;
}

export async function deleteHistory(id, userId) {
  const [r] = await pool.execute('DELETE FROM copywriting_history WHERE id = ? AND user_id = ?', [id, userId]);
  return r.affectedRows > 0;
}
