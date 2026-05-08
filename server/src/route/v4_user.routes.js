/**
 * Movio AI v4.1 — User Routes
 * G5 后端开发 | W4
 * GET  /api/user/profile       — 用户信息 + 会员状态
 * PUT  /api/user/profile       — 更新用户资料
 * GET  /api/user/stats         — 用量统计
 * PUT  /api/user/change-password — 修改密码（需旧密码验证）
 */
import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { success, error } from '../utils/response.js';
import { authMiddleware } from '../middleware/auth.js';
import db from '../dao/db.js';

const router = Router();

function _validate(schema) {
  return (req, res, next) => {
    const r = schema.safeParse(req.body);
    if (!r.success) {
      return error(res, 400, r.error.errors.map(e => e.message).join('; '));
    }
    req.validated = r.data;
    next();
  };
}

const _phoneRegex = /^1[3-9]\d{9}$/;

const updateProfileSchema = z.object({
  nickname: z.string().max(30).optional(),
  phone: z.string().regex(_phoneRegex, '手机号格式不正确').optional().nullable(),
  email: z.string().email('邮箱格式不正确').optional().nullable(),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, '请提供原密码'),
  newPassword: z.string().min(8, '新密码至少8位').max(64),
});

// 所有路由需要登录
router.use(authMiddleware);

router.get('/profile', async (req, res) => {
  try {
    const conn = await db.getConnection();
    try {
      const [users] = await conn.query(
        'SELECT id, nickname, phone, email, avatar, role, create_time FROM `user` WHERE id = ?',
        [req.user.id],
      );
      if (users.length === 0) return error(res, 404, '用户不存在');

      const [membership] = await conn.query(
        'SELECT plan_type, credit_balance, start_time, end_time FROM user_membership WHERE user_id = ?',
        [req.user.id],
      );

      const [points] = await conn.query(
        'SELECT balance as points_balance FROM points_account WHERE user_id = ?',
        [req.user.id],
      );

      return success(res, {
        ...users[0],
        plan_type: membership[0]?.plan_type || 0,
        credit_balance: membership[0]?.credit_balance || 0,
        start_time: membership[0]?.start_time,
        end_time: membership[0]?.end_time,
        points_balance: points[0]?.points_balance || 0,
        role: req.user.role,
      });
    } finally {
      conn.release();
    }
  } catch (err) {
    return error(res, 500, err.message);
  }
});

router.get('/stats', async (req, res) => {
  try {
    const conn = await db.getConnection();
    try {
      const [[{ todayTasks }]] = await conn.query(
        'SELECT COUNT(*) as todayTasks FROM job_queue WHERE user_id = ? AND DATE(created_at) = CURDATE()',
        [req.user.id],
      );
      const [[{ totalTasks }]] = await conn.query(
        'SELECT COUNT(*) as totalTasks FROM job_queue WHERE user_id = ?',
        [req.user.id],
      );
      const [[{ thisMonthConsumed }]] = await conn.query(
        `SELECT COALESCE(SUM(consumed), 0) as thisMonthConsumed FROM consumption_record
         WHERE user_id = ? AND DATE_FORMAT(create_time, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')`,
        [req.user.id],
      );

      return success(res, { todayTasks, totalTasks, thisMonthConsumed });
    } finally {
      conn.release();
    }
  } catch (err) {
    return error(res, 500, err.message);
  }
});

// PUT /api/user/profile — 更新资料
router.put('/profile', _validate(updateProfileSchema), async (req, res) => {
  try {
    const { nickname, phone, email } = req.validated;
    const updates = [];
    const params = [];

    if (nickname !== undefined) { updates.push('nickname = ?'); params.push(nickname); }
    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone || null); }
    if (email !== undefined) { updates.push('email = ?'); params.push(email || null); }

    if (updates.length === 0) return error(res, 400, '无更新字段');

    const conn = await db.getConnection();
    try {
      await conn.query(
        `UPDATE \`user\` SET ${updates.join(', ')} WHERE id = ?`,
        [...params, req.user.id],
      );
      return success(res, {}, '资料已更新');
    } finally {
      conn.release();
    }
  } catch (err) {
    return error(res, 500, err.message);
  }
});

// PUT /api/user/change-password — 修改密码（需旧密码）
router.put('/change-password', _validate(changePasswordSchema), async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.validated;

    const conn = await db.getConnection();
    try {
      const [users] = await conn.query(
        'SELECT password_hash FROM `user` WHERE id = ?',
        [req.user.id],
      );
      if (users.length === 0) return error(res, 404, '用户不存在');

      const valid = await bcrypt.compare(oldPassword, users[0].password_hash);
      if (!valid) return error(res, 403, '原密码不正确');

      const hash = await bcrypt.hash(newPassword, 12);
      await conn.query('UPDATE `user` SET password_hash = ? WHERE id = ?', [hash, req.user.id]);
      return success(res, {}, '密码已修改');
    } finally {
      conn.release();
    }
  } catch (err) {
    return error(res, 500, err.message);
  }
});

export default router;
