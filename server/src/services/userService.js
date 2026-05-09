import { USER_STATUS } from '../constants/domainStatus.js';
import { BusinessError } from '../utils/businessError.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as userDao from '../dao/userDao.js';
import { jwtSecret } from '../config/index.js';
import { guardSQL } from '../utils/sqlGuard.js';
import { generateTokens, refreshAccessToken as refreshTokenUtil, revokeAccessToken as revokeTokenUtil, revokeAllUserTokens as revokeAllUtil } from '../utils/jwtToken.js';

const SALT_ROUNDS = 10;

export async function register({ username, password, nickname }) {
  guardSQL(username, 'username');
  guardSQL(nickname, 'nickname');

  const existing = await userDao.findByUsername(username);
  if (existing) throw new BusinessError(400, '用户名已存在');

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const userId = await userDao.insertUser({ username, password: hashed, nickname: nickname || username });

  return { id: userId, username, nickname: nickname || username };
}

export async function login({ username, password }) {
  guardSQL(username, 'username');

  const user = await userDao.findByUsername(username);
  if (!user) throw new BusinessError(401, '用户名或密码错误');

  if (user.status !== USER_STATUS.ACTIVE) throw new BusinessError(403, '账号已被禁用，请联系客服');

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new BusinessError(401, '用户名或密码错误');

  await userDao.updateLastLogin(user.id);

  const tokens = generateTokens({
    id: user.id,
    username: user.username,
    role: user.role || 'user',
    tenantId: user.tenant_id || 0,
  });

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn,
    user: {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      phone: user.phone,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      tenantId: user.tenant_id || 0,
      tenantName: user.tenant_name || '',
    },
  };
}

export async function getProfile(userId) {
  const user = await userDao.findById(userId);
  if (!user) throw new BusinessError(404, '用户不存在');
  return user;
}

export async function updateProfile(userId, { nickname, phone, email, avatar }) {
  const fields = {};
  if (nickname !== undefined) { guardSQL(nickname, 'nickname'); fields.nickname = nickname; }
  if (phone !== undefined) fields.phone = phone;
  if (email !== undefined) fields.email = email;
  if (avatar !== undefined) fields.avatar = avatar;
  if (Object.keys(fields).length === 0) throw new BusinessError(400, '没有可更新的字段');
  await userDao.updateUser(userId, fields);
  return userDao.findById(userId);
}

export async function changePassword(userId, { oldPassword, newPassword }) {
  if (!oldPassword || !newPassword || newPassword.length < 6) throw new BusinessError(400, '新密码长度不能少于6位');
  const user = await userDao.findById(userId);
  if (!user) throw new BusinessError(404, '用户不存在');

  // 需要查出密码hash
  const full = await userDao.findByUsername(user.username);
  const match = await bcrypt.compare(oldPassword, full.password);
  if (!match) throw new BusinessError(400, '原密码错误');

  const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await userDao.updatePassword(userId, hashed);
  return { success: true };
}

export async function forgotPassword(username) {
  guardSQL(username, 'username');
  const user = await userDao.findByUsername(username);
  if (!user) throw new BusinessError(404, '该用户名不存在');
  // Mock: 生成重置令牌（真实环境发邮件/短信）
  const resetToken = jwt.sign({ userId: user.id, purpose: 'reset' }, jwtSecret, { expiresIn: '15m' });
  return { message: '重置链接已发送至注册邮箱（Mock模式：token=' + resetToken.slice(-20) + '）' };
}

export async function resetPassword(token, newPassword) {
  if (!newPassword || newPassword.length < 6) throw new BusinessError(400, '新密码长度不能少于6位');
  let payload;
  try { payload = jwt.verify(token, jwtSecret); } catch { throw new BusinessError(400, '重置链接已过期或无效'); }
  if (payload.purpose !== 'reset') throw new BusinessError(400, '无效的重置令牌');
  const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await userDao.updatePassword(payload.userId, hashed);
  return { success: true };
}

export async function getUserStats(userId, _tenantId = 0) {
  const stats = await userDao.getUserStats(userId);
  return {
    todayTaskCount: stats.todayTotal,
    creditBalance: Math.max(0, 500 + Number(stats.creditUsed)),
    totalTaskCount: stats.taskTotal,
  };
}

// ========================= JWT 双令牌 Service =========================

export { refreshTokenUtil as refreshAccessToken };
export { revokeTokenUtil as revokeAccessToken };
export { revokeAllUtil as revokeAllUserTokens };
