import db from './db.js';

export async function listByUser(userId, { page = 1, size = 20 }) {
  const offset = (page - 1) * size;
  const [rows] = await db.query('SELECT * FROM user_collections WHERE user_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?', [userId, size, offset]);
  const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM user_collections WHERE user_id = ?', [userId]);
  return { list: rows, total };
}

export async function getById(id) {
  const [rows] = await db.query('SELECT * FROM user_collections WHERE id = ?', [id]);
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

export async function update(id, data) {
  const fields = []; const values = [];
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) { fields.push(`${k} = ?`); values.push(v); }
  }
  if (!fields.length) return false;
  values.push(id);
  await db.query(`UPDATE user_collections SET ${fields.join(', ')} WHERE id = ?`, values);
  return true;
}

export async function remove(id) {
  await db.query('DELETE FROM user_collections WHERE id = ?', [id]);
}
