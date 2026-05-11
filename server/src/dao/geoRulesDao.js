import pool from './db.js';

const table = 'geo_rules';

export const listAll = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${table} ORDER BY priority DESC, id ASC LIMIT 200`);
  return rows;
};

export const getById = async (id) => {
  const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [id]);
  return rows[0] || null;
};

export const getMatchingRules = async (countryCode, platformCode) => {
  const [rows] = await pool.query(
    `SELECT * FROM ${table} WHERE enabled = 1 AND (
      JSON_CONTAINS(country_codes, ?) OR country_codes IS NULL
    )
    ORDER BY priority DESC`,
    [JSON.stringify(countryCode)],
  );
  return rows;
};

export const insert = async (fields) => {
  const allowed = ['rule_name', 'country_codes', 'platform_codes', 'locale', 'blocked_models', 'review_level', 'output_constraints', 'priority', 'enabled', 'description'];
  const keys = [];
  const vals = [];
  const placeholders = [];
  for (const k of allowed) {
    if (fields[k] !== undefined) {
      keys.push(k);
      vals.push(typeof fields[k] === 'object' ? JSON.stringify(fields[k]) : fields[k]);
      placeholders.push('?');
    }
  }
  if (keys.length === 0) throw new Error('No valid fields');
  const [result] = await pool.query(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders.join(', ')})`, vals);
  return result.insertId;
};

export const update = async (id, fields) => {
  const allowed = ['rule_name', 'country_codes', 'platform_codes', 'locale', 'blocked_models', 'review_level', 'output_constraints', 'priority', 'enabled', 'description'];
  const sets = [];
  const vals = [];
  for (const k of allowed) {
    if (fields[k] !== undefined) {
      sets.push(`${k} = ?`);
      vals.push(typeof fields[k] === 'object' ? JSON.stringify(fields[k]) : fields[k]);
    }
  }
  if (sets.length === 0) return 0;
  vals.push(id);
  const [result] = await pool.query(`UPDATE ${table} SET ${sets.join(', ')} WHERE id = ?`, vals);
  return result.affectedRows;
};

export const remove = async (id) => {
  const [result] = await pool.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
  return result.affectedRows;
};
