import { getContextDB as getDB } from './context.js';

const TABLE = 'platform_image_spec';

export async function listAll(req) {
  const db = getDB(req);
  const [rows] = await db.query(
    `SELECT * FROM ${TABLE} ORDER BY platform_code, spec_type`
  );
  return rows;
}

export async function getById(id, req) {
  const db = getDB(req);
  const [rows] = await db.execute(
    `SELECT * FROM ${TABLE} WHERE id = ?`, [id]
  );
  return rows[0] || null;
}

export async function listByPlatform(platformCode, req) {
  const db = getDB(req);
  const [rows] = await db.execute(
    `SELECT * FROM ${TABLE} WHERE platform_code = ? ORDER BY spec_type`, [platformCode]
  );
  return rows;
}

export async function create(data, req) {
  const db = getDB(req);
  const fields = ['platform_code', 'spec_type', 'label', 'width', 'height', 'format', 'max_size_kb', 'bg_must_white', 'notes'];
  const placeholders = fields.map(() => '?').join(',');
  const values = fields.map(f => data[f] ?? null);
  const [result] = await db.execute(
    `INSERT INTO ${TABLE} (${fields.join(',')}) VALUES (${placeholders})`, values
  );
  return result.insertId;
}

export async function update(id, data, req) {
  const db = getDB(req);
  const setters = [];
  const params = [];
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) {
      setters.push(`${k} = ?`);
      params.push(v);
    }
  }
  if (setters.length === 0) return 0;
  params.push(id);
  const [result] = await db.execute(
    `UPDATE ${TABLE} SET ${setters.join(', ')} WHERE id = ?`, params
  );
  return result.affectedRows;
}

export async function remove(id, req) {
  const db = getDB(req);
  const [result] = await db.execute(
    `DELETE FROM ${TABLE} WHERE id = ?`, [id]
  );
  return result.affectedRows;
}

export async function getAdaptSpec(platformCode, req) {
  const db = getDB(req);
  const [rows] = await db.execute(
    `SELECT * FROM ${TABLE} WHERE platform_code = ? ORDER BY spec_type`, [platformCode]
  );
  return rows;
}

export default { listAll, getById, listByPlatform, create, update, remove, getAdaptSpec };
