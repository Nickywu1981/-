import db from './db.js';

const COLS = 'id, user_id, name, description, cover_url, is_public, sort_order, created_at, updated_at';

export async function listByUser(userId, { page = 1, size = 20 }) {
  const offset = (page - 1) * size;
  const [rows] = await db.query(`SELECT ${COLS} FROM user_collections WHERE user_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?`, [userId, size, offset]);
  const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM user_collections WHERE user_id = ?', [userId]);
  return { list: rows, total };
}

export async function getById(id, userId) {
  const [rows] = await db.query(`SELECT ${COLS} FROM user_collections WHERE id = ? AND user_id = ?`, [id, userId]);
  return rows[0] || null;
}

export async function create(data) {
  const { user_id, name, description, cover_url, is_public } = data;
  const [result] = await db.query(
    'INSERT INTO user_collections (user_id, name, description, cover_url, is_public) VALUES (?, ?, ?, ?, ?)',
    [user_id, name, description || '', cover_url || '', is_public || 0],
  );
  return result.insertId;
}

export async function update(id, userId, data) {
  const allowed = ['name', 'description', 'cover_url', 'is_public', 'sort_order'];
  const fields = []; const values = [];
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined && allowed.includes(k)) { fields.push(`${k} = ?`); values.push(v); }
  }
  if (!fields.length) return 0;
  values.push(id, userId);
  const [r] = await db.query(`UPDATE user_collections SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, values);
  return r.affectedRows;
}

export async function remove(id, userId) {
  const [r] = await db.query('DELETE FROM user_collections WHERE id = ? AND user_id = ?', [id, userId]);
  return r.affectedRows > 0;
}
