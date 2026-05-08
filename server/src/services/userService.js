import bcrypt from 'bcrypt';
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
  if (existing) {
    const err = new Error('用户名已存在');
    err.statusCode = 400;
    throw err;
  }

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const userId = await userDao.insertUser({ username, password: hashed, nickname: nickname || username });

  return { id: userId, username, nickname: nickname || username };
}

export async function login({ username, password }) {
  guardSQL(username, 'username');

  const user = await userDao.findByUsername(username);
  if (!user) {
    const err = new Error('用户名或密码错误');
    err.statusCode = 401;
    throw err;
  }

  if (user.status !== 1) {
    const err = new Error('账号已被禁用，请联系客服');
    err.statusCode = 403;
    throw err;
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    const err = new Error('用户名或密码错误');
    err.statusCode = 401;
    throw err;
  }

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
  if (!user) {
    const err = new Error('用户不存在');
    err.statusCode = 404;
    throw err;
  }
  return user;
}

export async function updateProfile(userId, { nickname, phone, email, avatar }) {
  const fields = {};
  if (nickname !== undefined) { guardSQL(nickname, 'nickname'); fields.nickname = nickname; }
  if (phone !== undefined) fields.phone = phone;
  if (email !== undefined) fields.email = email;
  if (avatar !== undefined) fields.avatar = avatar;
  if (Object.keys(fields).length === 0) {
    const err = new Error('没有可更新的字段');
    err.statusCode = 400;
    throw err;
  }
  await userDao.updateUser(userId, fields);
  return userDao.findById(userId);
}

export async function changePassword(userId, { oldPassword, newPassword }) {
  if (!oldPassword || !newPassword || newPassword.length < 6) {
    const err = new Error('新密码长度不能少于6位');
    err.statusCode = 400;
    throw err;
  }
  const user = await userDao.findById(userId);
  if (!user) { const err = new Error('用户不存在'); err.statusCode = 404; throw err; }

  // 需要查出密码hash
  const full = await userDao.findByUsername(user.username);
  const match = await bcrypt.compare(oldPassword, full.password);
  if (!match) { const err = new Error('原密码错误'); err.statusCode = 400; throw err; }

  const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await userDao.updatePassword(userId, hashed);
  return { success: true };
}

export async function forgotPassword(username) {
  guardSQL(username, 'username');
  const user = await userDao.findByUsername(username);
  if (!user) { const err = new Error('该用户名不存在'); err.statusCode = 404; throw err; }
  // Mock: 生成重置令牌（真实环境发邮件/短信）
  const resetToken = jwt.sign({ userId: user.id, purpose: 'reset' }, jwtSecret, { expiresIn: '15m' });
  return { message: '重置链接已发送至注册邮箱（Mock模式：token=' + resetToken.slice(-20) + '）' };
}

export async function resetPassword(token, newPassword) {
  if (!newPassword || newPassword.length < 6) {
    const err = new Error('新密码长度不能少于6位');
    err.statusCode = 400;
    throw err;
  }
  let payload;
  try { payload = jwt.verify(token, jwtSecret); } catch { const err = new Error('重置链接已过期或无效'); err.statusCode = 400; throw err; }
  if (payload.purpose !== 'reset') { const err = new Error('无效的重置令牌'); err.statusCode = 400; throw err; }
  const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await userDao.updatePassword(payload.userId, hashed);
  return { success: true };
}

export async function listUsers({ query, opts }) {
  const keyword = query.keyword || '';
  guardSQL(keyword, 'keyword');
  const { paginatedQuery } = await import('../utils/pagination.js');
  return paginatedQuery({ query, opts }, () => userDao.countUsers(keyword), (pager) => userDao.listUsers(pager, keyword));
}

export async function getUserStats(userId, tenantId = 0) {
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
