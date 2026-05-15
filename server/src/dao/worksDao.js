/**
 * Works DAO — 用户作品查询层
 * G6 Backend-B | 2026-05-15
 */
import pool from './db.js';

export async function findWorksByIds(workIds, userId) {
  const placeholders = workIds.map(() => '?').join(',');
  const [rows] = await pool.query(
    `SELECT id, task_type, result_data, title, create_time FROM works WHERE id IN (${placeholders}) AND user_id = ? AND status = 2`,
    [...workIds, userId],
  );
  return rows;
}

export async function listByCategory(userId, categoryPrefix, { limit = 20, offset = 0 } = {}) {
  const [rows] = await pool.query(
    'SELECT id, user_id, task_category, task_type, title, thumbnail_url, result_data, status, create_time FROM user_works WHERE user_id = ? AND task_category LIKE ? ORDER BY create_time DESC LIMIT ? OFFSET ?',
    [userId, categoryPrefix, limit, offset],
  );
  return rows;
}

export async function findExportableWorks(userId, { page = 1, pageSize = 20, type } = {}) {
  let where = 'user_id = ? AND status = 2';
  const params = [userId];
  if (type) { where += ' AND task_type = ?'; params.push(type); }

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM works WHERE ${where}`, params);
  const [rows] = await pool.query(
    `SELECT id, task_type, title, thumbnail_url, result_data, create_time FROM works WHERE ${where} ORDER BY create_time DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize],
  );
  return { total, list: rows, page, pageSize };
}
