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
  const limit = Number(pageSize);
  const hasType = type && type !== 'undefined';
  const where = hasType ? 'AND type = ?' : '';
  const bind = hasType ? [userId, type, String(offset), String(limit)] : [userId, String(offset), String(limit)];
  const [rows] = await pool.query(
    `SELECT id, type, inputs, outputs, model_id, token_used, status, created_at FROM copywriting_history WHERE user_id = ? ${where} ORDER BY created_at DESC LIMIT ?, ?`,
    bind,
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM copywriting_history WHERE user_id = ? ${where}`,
    hasType ? [userId, type] : [userId],
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
