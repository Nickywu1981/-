/**
 * i18n DAO — 动态翻译表 CRUD
 * Phase 1.2: 所有 SQL 参数化，批量 upsert 优化
 */
import pool from './db.js';

const COLS = 'id, locale, namespace, trans_key, trans_value, description, updated_by, created_at, updated_at';

export async function getAll(locale) {
  const [rows] = await pool.query(`SELECT ${COLS} FROM i18n_translation WHERE locale = ? ORDER BY namespace, trans_key`, [locale]);
  return rows;
}

export async function getByNamespace(locale, namespace) {
  const [rows] = await pool.query(`SELECT ${COLS} FROM i18n_translation WHERE locale = ? AND namespace = ? ORDER BY trans_key`, [locale, namespace]);
  return rows;
}

export async function search(locale, query) {
  const [rows] = await pool.query(
    `SELECT ${COLS} FROM i18n_translation WHERE locale = ? AND (trans_key LIKE ? OR trans_value LIKE ?) ORDER BY namespace, trans_key LIMIT 200`,
    [locale, `%${query}%`, `%${query}%`],
  );
  return rows;
}

export async function getByKey(locale, transKey) {
  const [rows] = await pool.query(`SELECT ${COLS} FROM i18n_translation WHERE locale = ? AND trans_key = ? LIMIT 1`, [locale, transKey]);
  return rows[0] || null;
}

export async function upsert(locale, namespace, transKey, transValue, updatedBy) {
  const [result] = await pool.query(
    `INSERT INTO i18n_translation (locale, namespace, trans_key, trans_value, updated_by)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE trans_value = VALUES(trans_value), updated_by = VALUES(updated_by)`,
    [locale, namespace, transKey, transValue, updatedBy || null],
  );
  return result.affectedRows;
}

export async function upsertBatch(locale, entries) {
  if (!entries.length) return 0;
  const conn = await pool.getConnection();
  try {
    const sql = `INSERT INTO i18n_translation (locale, namespace, trans_key, trans_value, updated_by)
     VALUES ${entries.map(() => '(?, ?, ?, ?, ?)').join(', ')}
     ON DUPLICATE KEY UPDATE trans_value = VALUES(trans_value), updated_by = VALUES(updated_by)`;
    const params = entries.flatMap(e => [locale, e.namespace, e.key, e.value, e.updatedBy || null]);
    const [result] = await conn.query(sql, params);
    return result.affectedRows;
  } finally {
    conn.release();
  }
}

export async function remove(locale, transKey) {
  const [result] = await pool.query('DELETE FROM i18n_translation WHERE locale = ? AND trans_key = ?', [locale, transKey]);
  return result.affectedRows;
}

export async function insertLog(locale, transKey, oldValue, newValue, changedBy) {
  await pool.query(
    'INSERT INTO i18n_translation_log (locale, trans_key, old_value, new_value, changed_by) VALUES (?, ?, ?, ?, ?)',
    [locale, transKey, oldValue || null, newValue || null, changedBy || null],
  );
}

export async function listLogs(locale, transKey, limit = 50) {
  const [rows] = await pool.query(
    'SELECT * FROM i18n_translation_log WHERE locale = ? AND trans_key = ? ORDER BY changed_at DESC LIMIT ?',
    [locale, transKey, limit],
  );
  return rows;
}

export async function getNamespaces(locale) {
  const [rows] = await pool.query('SELECT DISTINCT namespace FROM i18n_translation WHERE locale = ? ORDER BY namespace', [locale]);
  return rows.map(r => r.namespace);
}
