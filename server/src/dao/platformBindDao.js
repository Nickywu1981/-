/**
 * Platform Bind DAO — 用户平台绑定数据访问层
 * 表: user_platform_bind
 */
import pool from './db.js';

export async function listByUserId(userId) {
  const [rows] = await pool.query(
    'SELECT id, bind_type, platform, account_id, account_name, created_at FROM user_platform_bind WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC',
    [userId],
  );
  return rows;
}

export async function upsert(userId, { bind_type, platform, account_id, account_name }) {
  const [result] = await pool.query(
    `INSERT INTO user_platform_bind (user_id, bind_type, platform, account_id, account_name)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE account_name = ?, is_active = 1`,
    [userId, bind_type || 'shop', platform, account_id, account_name || '', account_name || ''],
  );
  return result;
}

export async function deactivate(id, userId) {
  const [result] = await pool.query(
    'UPDATE user_platform_bind SET is_active = 0 WHERE id = ? AND user_id = ?',
    [id, userId],
  );
  return result.affectedRows;
}
