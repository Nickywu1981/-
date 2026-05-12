/**
 * Movio AI v4.1 — Platform Bind Controller
 */
import { wrapController } from '../utils/wrapController.js';
import { success } from '../utils/response.js';
import db from '../dao/db.js';

export const getBindings = wrapController(async (req, res) => {
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.query(
      'SELECT id, bind_type, platform, account_id, account_name, created_at FROM user_platform_bind WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC',
      [req.user.id],
    );
    return success(res, { list: rows });
  } finally {
    conn.release();
  }
});

export const bind = wrapController(async (req, res) => {
  const { platform, bind_type, account_id, account_name } = req.validated;
  const conn = await db.getConnection();
  try {
    await conn.query(
      `INSERT INTO user_platform_bind (user_id, bind_type, platform, account_id, account_name)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE account_name = ?, is_active = 1`,
      [req.user.id, bind_type || 'shop', platform, account_id, account_name || '', account_name || ''],
    );
    return success(res, null, '绑定成功');
  } finally {
    conn.release();
  }
});

export const unbind = wrapController(async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.query(
      'UPDATE user_platform_bind SET is_active = 0 WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id],
    );
    return success(res, null, '解绑成功');
  } finally {
    conn.release();
  }
});

export const publish = wrapController(async (req, res) => {
  const { platform, content_url } = req.validated;
  return success(res, { published_url: content_url, platform, status: 'submitted' }, '已提交发布任务');
});
