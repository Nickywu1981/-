import pool from './db.js';
import { parsePagination } from '../utils/pagination.js';

const TABLE = 'operation_audit_log';

export async function insert({ userId, action, targetType, targetId, targetTitle, details, ip, userAgent }) {
  const [r] = await pool.query(
    `INSERT INTO ${TABLE} (user_id, action, target_type, target_id, target_title, details, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, action, targetType, targetId || null, targetTitle || null, details ? JSON.stringify(details) : null, ip || null, userAgent || null],
  );
  return r.insertId;
}

export async function list({ userId, action, targetType, targetId, page = 1, pageSize = 20 }) {
  const where = ['1=1'];
  const params = [];
  const { offset } = parsePagination({ page, pageSize });
  if (userId) { where.push('user_id = ?'); params.push(userId); }
  if (action) { where.push('action = ?'); params.push(action); }
  if (targetType) { where.push('target_type = ?'); params.push(targetType); }
  if (targetId) { where.push('target_id = ?'); params.push(targetId); }

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM ${TABLE} WHERE ${where.join(' AND ')}`, params);
  const [rows] = await pool.query(
    `SELECT * FROM ${TABLE} WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return { list: rows, total, page, pageSize };
}
