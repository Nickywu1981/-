import pool from './db.js';

const table = 'site_config';

export const getAll = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${table} ORDER BY id LIMIT 200`);
  return rows;
};

export const getByKey = async (key) => {
  const [rows] = await pool.query(`SELECT * FROM ${table} WHERE config_key = ?`, [key]);
  return rows[0] || null;
};

export const getByKeys = async (keys) => {
  const placeholders = keys.map(() => '?').join(',');
  const [rows] = await pool.query(`SELECT * FROM ${table} WHERE config_key IN (${placeholders})`, keys);
  return rows;
};

export const upsert = async (key, value, type = 'text', description = '') => {
  const [result] = await pool.query(
    `INSERT INTO ${table} (config_key, config_value, config_type, description)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), config_type = VALUES(config_type), description = VALUES(description)`,
    [key, value, type, description],
  );
  return result;
};

export const remove = async (id) => {
  const [result] = await pool.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
  return result.affectedRows;
};

export const removeByKey = async (key) => {
  const [result] = await pool.query(`DELETE FROM ${table} WHERE config_key = ?`, [key]);
  return result.affectedRows;
};
