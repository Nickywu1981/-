import pool from './db.js';

const table = 'sys_config_log';

export const insertLog = async ({ configKey, oldValue, newValue, changedBy }) => {
  const [result] = await pool.query(
    `INSERT INTO ${table} (group_key, item_key, old_value, new_value, changed_by)
     VALUES ('site_config', ?, ?, ?, ?)`,
    [configKey, oldValue ?? '', newValue ?? '', changedBy ?? null],
  );
  return result.insertId;
};

export const getLogsByKey = async (configKey, limit = 50) => {
  const [rows] = await pool.query(
    `SELECT * FROM ${table} WHERE group_key = 'site_config' AND item_key = ? ORDER BY created_at DESC LIMIT ?`,
    [configKey, Number(limit)],
  );
  return rows;
};
