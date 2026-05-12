/**
 * Movio AI v4.1 — User Controller
 */
import bcrypt from 'bcryptjs';
import { wrapController } from '../utils/wrapController.js';
import { success } from '../utils/response.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import db from '../dao/db.js';
import membershipDao from '../dao/membershipDao.js';

export const getProfile = wrapController(async (req, res) => {
  const conn = await db.getConnection();
  try {
    const [users] = await conn.query(
      'SELECT id, nickname, phone, email, avatar, role, create_time FROM `user` WHERE id = ?',
      [req.user.id],
    );
    if (users.length === 0) throw new BusinessError(ERROR_CODE.NOT_FOUND, '用户不存在');

    const [membership] = await conn.query(
      'SELECT plan_type, credit_balance, start_time, end_time, auto_renew FROM user_membership WHERE user_id = ? AND is_deleted = 0',
      [req.user.id],
    );

    return success(res, {
      ...users[0],
      plan_type: membership[0]?.plan_type || 0,
      credit_balance: membership[0]?.credit_balance || 0,
      start_time: membership[0]?.start_time,
      end_time: membership[0]?.end_time,
      auto_renew: membership[0]?.auto_renew || 0,
      role: req.user.role,
    });
  } finally {
    conn.release();
  }
});

export const getStats = wrapController(async (req, res) => {
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
});

export const updateProfile = wrapController(async (req, res) => {
  const { nickname, phone, email } = req.validated;
  const updates = [];
  const params = [];

  if (nickname !== undefined) { updates.push('nickname = ?'); params.push(nickname); }
  if (phone !== undefined) { updates.push('phone = ?'); params.push(phone || null); }
  if (email !== undefined) { updates.push('email = ?'); params.push(email || null); }

  if (updates.length === 0) throw new BusinessError(ERROR_CODE.BAD_REQUEST, '无更新字段');

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
});

export const changePassword = wrapController(async (req, res) => {
  const { oldPassword, newPassword } = req.validated;

  const conn = await db.getConnection();
  try {
    const [users] = await conn.query(
      'SELECT password FROM `user` WHERE id = ?',
      [req.user.id],
    );
    if (users.length === 0) throw new BusinessError(ERROR_CODE.NOT_FOUND, '用户不存在');

    const valid = await bcrypt.compare(oldPassword, users[0].password);
    if (!valid) throw new BusinessError(ERROR_CODE.PARAM_INVALID, '原密码不正确');

    const hash = await bcrypt.hash(newPassword, 12);
    await conn.query('UPDATE `user` SET password = ? WHERE id = ?', [hash, req.user.id]);

    const { revokeAllUserTokens } = await import('../utils/jwtToken.js');
    await revokeAllUserTokens(req.user.id);

    return success(res, {}, '密码已修改，请重新登录');
  } finally {
    conn.release();
  }
});

export const toggleAutoRenew = wrapController(async (req, res) => {
  const m = await membershipDao.findByUserId(req.user.id);
  if (!m || m.plan_type === 'free' || m.plan_type === 0) {
    throw new BusinessError(ERROR_CODE.BAD_REQUEST, '仅付费会员支持自动续费');
  }
  await membershipDao.setAutoRenew(req.user.id, req.validated.autoRenew);
  return success(res, { autoRenew: req.validated.autoRenew }, '自动续费已' + (req.validated.autoRenew ? '开启' : '关闭'));
});
