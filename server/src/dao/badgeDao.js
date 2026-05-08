import pool from './db.js';

const table = 'marketing_badges';

export async function listBadges({ category, status } = {}) {
  let sql = `SELECT * FROM ${table} WHERE is_deleted = 0`;
  const params = [];
  if (status !== undefined) { sql += ' AND status = ?'; params.push(status); }
  if (category) { sql += ' AND category = ?'; params.push(category); }
  sql += ' ORDER BY sort_order ASC, id DESC';
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function getBadgeById(id) {
  const [rows] = await pool.execute(`SELECT * FROM ${table} WHERE id = ? AND is_deleted = 0`, [id]);
  return rows[0] || null;
}

export async function createBadge(data) {
  const { name, icon, style_class, category = 'general', sort_order = 0 } = data;
  const [result] = await pool.execute(
    `INSERT INTO ${table} (name, icon, style_class, category, sort_order, status) VALUES (?, ?, ?, ?, ?, 1)`,
    [name, icon, style_class, category, sort_order],
  );
  return result.insertId;
}

export async function updateBadge(id, data) {
  const allowed = ['name', 'icon', 'style_class', 'category', 'sort_order', 'status'];
  const fields = [];
  const values = [];
  for (const [k, v] of Object.entries(data)) {
    if (allowed.includes(k)) { fields.push(`${k}=?`); values.push(v); }
  }
  if (!fields.length) return false;
  values.push(id);
  const [result] = await pool.execute(`UPDATE ${table} SET ${fields.join(',')} WHERE id=?`, values);
  return result.affectedRows > 0;
}

export async function deleteBadge(id) {
  const [result] = await pool.execute(`UPDATE ${table} SET is_deleted = 1 WHERE id = ?`, [id]);
  return result.affectedRows > 0;
}

export async function getAvailableBadges() {
  return listBadges({ status: 1 });
}

export default { listBadges, getBadgeById, createBadge, updateBadge, deleteBadge, getAvailableBadges };
