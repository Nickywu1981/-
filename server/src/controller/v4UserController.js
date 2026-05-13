/**
 * Movio AI v4.1 — User Controller
 */
import bcrypt from 'bcryptjs';
import { wrapController } from '../utils/wrapController.js';

const SALT_ROUNDS = 12;
import { success } from '../utils/response.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import * as userDao from '../dao/userDao.js';
import membershipDao from '../dao/membershipDao.js';

export const getProfile = wrapController(async (req, res) => {
  const user = await userDao.findById(req.user.id);
  if (!user) throw new BusinessError(ERROR_CODE.NOT_FOUND);

  const m = await membershipDao.findByUserId(req.user.id);

  return success(res, {
    id: user.id,
    nickname: user.nickname,
    phone: user.phone,
    email: user.email,
    avatar_url: user.avatar,
    role: user.role,
    created_at: user.create_time,
    plan_type: m?.plan_type || 0,
    credit_balance: m?.credit_balance || 0,
    start_time: m?.start_time,
    end_time: m?.end_time,
    auto_renew: m?.auto_renew || 0,
  });
});

export const getStats = wrapController(async (req, res) => {
  // Aggregate stats across job_queue + consumption_record — no dedicated DAO yet
  const stats = await userDao.getUserStats(req.user.id);
  return success(res, stats);
});

export const updateProfile = wrapController(async (req, res) => {
  const { nickname, phone, email } = req.validated;
  const fields = {};
  if (nickname !== undefined) fields.nickname = nickname;
  if (phone !== undefined) fields.phone = phone || null;
  if (email !== undefined) fields.email = email || null;

  if (Object.keys(fields).length === 0) throw new BusinessError(ERROR_CODE.BAD_REQUEST);

  await userDao.updateUser(req.user.id, fields);
  return success(res, {}, '资料已更新');
});

export const changePassword = wrapController(async (req, res) => {
  const { oldPassword, newPassword } = req.validated;

  const user = await userDao.findById(req.user.id);
  if (!user) throw new BusinessError(ERROR_CODE.NOT_FOUND);

  const valid = await bcrypt.compare(oldPassword, user.password);
  if (!valid) throw new BusinessError(ERROR_CODE.PARAM_INVALID);

  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await userDao.updatePassword(req.user.id, hash);

  const { revokeAllUserTokens } = await import('../utils/jwtToken.js');
  await revokeAllUserTokens(req.user.id);

  return success(res, {}, '密码已修改，请重新登录');
});

export const toggleAutoRenew = wrapController(async (req, res) => {
  const m = await membershipDao.findByUserId(req.user.id);
  if (!m || m.plan_type === 'free' || m.plan_type === 0) {
    throw new BusinessError(ERROR_CODE.BAD_REQUEST);
  }
  await membershipDao.setAutoRenew(req.user.id, req.validated.autoRenew);
  return success(res, { autoRenew: req.validated.autoRenew }, '自动续费已' + (req.validated.autoRenew ? '开启' : '关闭'));
});
