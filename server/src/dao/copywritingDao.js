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
  const offset = (page - 1) * pageSize;
  const where = type ? 'AND type = ?' : '';
  const params = type ? [userId, type, offset, pageSize] : [userId, offset, pageSize];
  const [rows] = await pool.execute(
    `SELECT id, type, inputs, outputs, model_id, token_used, status, created_at FROM copywriting_history WHERE user_id = ? ${where} ORDER BY created_at DESC LIMIT ?, ?`,
    params,
  );
  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM copywriting_history WHERE user_id = ? ${where}`,
    type ? [userId, type] : [userId],
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
