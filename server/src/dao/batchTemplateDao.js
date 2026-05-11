import pool from '../dao/db.js';

export async function insertTemplate(userId, { name, operation, platform, style, nightMode, imageCount }) {
  const [res] = await pool.execute(
    `INSERT INTO user_batch_template (user_id, name, operation, platform, style, night_mode, image_count)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, name, operation, platform, style, nightMode ? 1 : 0, imageCount],
  );
  return res.insertId;
}

export async function listTemplates(userId) {
  const [rows] = await pool.execute(
    'SELECT id, name, operation, platform, style, night_mode, image_count, create_time FROM user_batch_template WHERE user_id = ? AND is_deleted = 0 ORDER BY create_time DESC',
    [userId],
  );
  return rows;
}

export async function getTemplate(id, userId) {
  const [rows] = await pool.execute(
    'SELECT * FROM user_batch_template WHERE id = ? AND user_id = ? AND is_deleted = 0 LIMIT 1',
    [id, userId],
  );
  return rows[0] || null;
}

export async function deleteTemplate(id, userId) {
  const [r] = await pool.execute(
    'UPDATE user_batch_template SET is_deleted = 1 WHERE id = ? AND user_id = ?',
    [id, userId],
  );
  return r.affectedRows;
}
