import pool from './db.js';

const TABLE = 'platform_size';

export async function listAll(_req) {
  const [rows] = await pool.query(
    `SELECT id, platform, category, label, width, height, sort_order, create_time, update_time FROM ${TABLE} WHERE is_deleted = 0 ORDER BY platform, sort_order`,
  );
  return rows;
}

export async function getById(id, _req) {
  const [rows] = await pool.execute(
    `SELECT id, platform, category, label, width, height, sort_order, create_time, update_time FROM ${TABLE} WHERE id = ? AND is_deleted = 0`, [id],
  );
  return rows[0] || null;
}

export async function listByPlatform(platformCode, _req) {
  const [rows] = await pool.execute(
    `SELECT id, platform, category, label, width, height, sort_order, create_time, update_time FROM ${TABLE} WHERE platform = ? AND is_deleted = 0 ORDER BY sort_order`, [platformCode],
  );
  return rows;
}

export async function create(data, _req) {
  const fields = ['platform', 'category', 'label', 'width', 'height', 'sort_order'];
  const placeholders = fields.map(() => '?').join(',');
  const values = fields.map(f => data[f] ?? null);
  const [result] = await pool.execute(
    `INSERT INTO ${TABLE} (${fields.join(',')}) VALUES (${placeholders})`, values,
  );
  return result.insertId;
}

export async function update(id, data, _req) {
  const allowed = ['platform', 'category', 'label', 'width', 'height', 'sort_order'];
  const setters = [];
  const params = [];
  for (const k of allowed) {
    if (data[k] !== undefined && data[k] !== null) {
      setters.push(`${k} = ?`);
      params.push(data[k]);
    }
  }
  if (setters.length === 0) return 0;
  params.push(id);
  const [result] = await pool.execute(
    `UPDATE ${TABLE} SET ${setters.join(', ')} WHERE id = ? AND is_deleted = 0`, params,
  );
  return result.affectedRows;
}

export async function remove(id, _req) {
  const [result] = await pool.execute(
    `UPDATE ${TABLE} SET is_deleted = 1 WHERE id = ?`, [id],
  );
  return result.affectedRows;
}

export async function getAdaptSpec(platformCode, _req) {
  const [rows] = await pool.execute(
    `SELECT platform, category, label, width, height FROM ${TABLE} WHERE platform = ? AND is_deleted = 0 ORDER BY sort_order`, [platformCode],
  );
  return rows;
}
