import pool from './db.js';
import { parsePagination } from '../utils/pagination.js';

// ==================== 平台预设尺寸 ====================

export async function listPlatformSizes(platform = '') {
  let sql = 'SELECT id, platform, category, label, width, height FROM platform_size WHERE is_deleted = 0';
  const params = [];
  if (platform) {
    sql += ' AND platform = ?';
    params.push(platform);
  }
  sql += ' ORDER BY platform, sort_order ASC';
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function getPlatformById(id) {
  const [rows] = await pool.execute(
    'SELECT id, platform, category, label, width, height FROM platform_size WHERE id = ? AND is_deleted = 0 LIMIT 1',
    [id],
  );
  return rows[0] || null;
}

export async function listPlatforms() {
  const [rows] = await pool.execute(
    'SELECT DISTINCT platform FROM platform_size WHERE is_deleted = 0 ORDER BY platform',
  );
  return rows.map((r) => r.platform);
}

// ==================== 用户自定义尺寸模板 ====================

export async function insertUserTemplate({ userId, name, width, height, platform = '' }) {
  const [result] = await pool.execute(
    'INSERT INTO user_size_template (user_id, name, width, height, platform) VALUES (?, ?, ?, ?, ?)',
    [userId, name, width, height, platform],
  );
  return result.insertId;
}

export async function updateUserTemplate(id, userId, { name, width, height, platform }) {
  const [result] = await pool.execute(
    'UPDATE user_size_template SET name = ?, width = ?, height = ?, platform = ? WHERE id = ? AND user_id = ? AND is_deleted = 0',
    [name, width, height, platform, id, userId],
  );
  return result.affectedRows > 0;
}

export async function deleteUserTemplate(id, userId) {
  const [result] = await pool.execute(
    'UPDATE user_size_template SET is_deleted = 1 WHERE id = ? AND user_id = ?',
    [id, userId],
  );
  return result.affectedRows > 0;
}

export async function listUserTemplates(userId, { page = 1, pageSize = 20 } = {}) {
  const { offset } = parsePagination({ page, pageSize });
  const [rows] = await pool.execute(
    'SELECT id, name, width, height, platform, create_time FROM user_size_template WHERE user_id = ? AND is_deleted = 0 ORDER BY create_time DESC LIMIT ? OFFSET ?',
    [userId, pageSize, offset],
  );
  return rows;
}

export async function countUserTemplates(userId) {
  const [rows] = await pool.execute(
    'SELECT COUNT(*) AS total FROM user_size_template WHERE user_id = ? AND is_deleted = 0',
    [userId],
  );
  return rows[0].total;
}

export async function getUserTemplateById(id, userId) {
  const [rows] = await pool.execute(
    'SELECT id, name, width, height, platform, create_time FROM user_size_template WHERE id = ? AND user_id = ? AND is_deleted = 0 LIMIT 1',
    [id, userId],
  );
  return rows[0] || null;
}
