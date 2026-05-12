import pool from './db.js';
import { parsePagination } from '../utils/pagination.js';

export async function insertNotification({ userId, type, title, content }) {
  const [r] = await pool.execute(
    'INSERT INTO user_notification (user_id, type, title, content) VALUES (?, ?, ?, ?)',
    [userId, type, title, content],
  );
  return r.insertId;
}

export async function listByUser(userId, { page = 1, pageSize = 20 }) {
  const [rows] = await pool.query(
    'SELECT id, type, title, content, is_read, create_time FROM user_notification WHERE user_id = ? ORDER BY create_time DESC LIMIT ?, ?',
    [userId, offset, parseInt(pageSize, 10)],
  );
  return rows;
}

export async function countByUser(userId) {
  const [[{ total }]] = await pool.execute(
    'SELECT COUNT(*) AS total FROM user_notification WHERE user_id = ?',
    [userId],
  );
  return total;
}

export async function markAsRead(notificationId, userId) {
  const [r] = await pool.execute(
    'UPDATE user_notification SET is_read = 1 WHERE id = ? AND user_id = ?',
    [notificationId, userId],
  );
  return r.affectedRows;
}

export async function markAllAsRead(userId) {
  const [r] = await pool.execute(
    'UPDATE user_notification SET is_read = 1 WHERE user_id = ? AND is_read = 0',
    [userId],
  );
  return r.affectedRows;
}

export async function getUnreadCount(userId) {
  const [[{ total }]] = await pool.execute(
    'SELECT COUNT(*) AS total FROM user_notification WHERE user_id = ? AND is_read = 0',
    [userId],
  );
  return total;
}

export async function listAll({ userId, type, page = 1, pageSize = 20 }) {
  const conditions = [];
  const params = [];
  if (userId) { conditions.push('un.user_id = ?'); params.push(userId); }
  if (type) { conditions.push('un.type = ?'); params.push(type); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT un.*, u.nickname, u.phone, u.email FROM user_notification un LEFT JOIN user u ON un.user_id = u.id ${where} ORDER BY un.create_time DESC LIMIT ?, ?`,
    [...params, offset, parseInt(pageSize, 10)],
  );
  return rows;
}

export async function countAll({ userId, type } = {}) {
  const conditions = [];
  const params = [];
  if (userId) { conditions.push('user_id = ?'); params.push(userId); }
  if (type) { conditions.push('type = ?'); params.push(type); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM user_notification ${where}`,
    params,
  );
  return total;
}

export async function deleteNotification(id, userId) {
  const [result] = await pool.execute('DELETE FROM user_notification WHERE id = ? AND user_id = ?', [id, userId]);
  return result.affectedRows > 0;
}

export async function insertNotificationToUser(notification) {
  return insertNotification(notification);
}
