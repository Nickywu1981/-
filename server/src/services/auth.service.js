import { BusinessError } from '../utils/businessError.js';
import { USER_STATUS } from '../constants/domainStatus.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as userDao from '../dao/userDao.js';
import { jwtSecret as JWT_SECRET, jwtExpiresIn as JWT_EXPIRES } from '../config/index.js';

const SALT_ROUNDS = 12;
import * as smsService from './smsService.js';
import * as emailService from './emailService.js';
import logger from '../utils/logger.js';

function generateToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.role, nickname: user.nickname, tenantId: user.tenantId || 0 },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES },
  );
}

export async function register({ phone, email, password, nickname, inviteCode: _inviteCode }) {
  const username = phone || email || '';
  if (!username) throw new BusinessError(400, '请提供手机号或邮箱');

  const [byPhone, byEmail] = await Promise.all([
    phone ? userDao.findByPhone(phone) : null,
    email ? userDao.findByEmail(email) : null,
  ]);
  if (byPhone || byEmail) throw new BusinessError(400, '注册失败，请检查输入信息');

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const userId = await userDao.createUser({ phone: phone || '', email: email || '', password: passwordHash, nickname: nickname || '' });

  logger.info('[Auth] 注册成功', { userId });

  const user = { id: userId, role: 'free', nickname: nickname || '', tenantId: 0 };
  const token = generateToken(user);

  return {
    user: { id: userId, nickname: nickname || '', role: 'free' },
    token,
    token_expires_in: JWT_EXPIRES,
  };
}

export async function login({ phone, email, username, password }) {
  const identifier = username || phone || email || '';
  if (!identifier) throw new BusinessError(400, '请提供手机号、邮箱或用户名');

  const user = await userDao.findByUsername(identifier);

  // Prevent timing-based account enumeration: always run bcrypt
  const DUMMY = '$2a$12$abcdefghijklmnopqrstuvabcdefghijklmnopqrstuv34567890123';
  const validPassword = await bcrypt.compare(password, user ? user.password : DUMMY);

  if (!user || !validPassword) throw new BusinessError(401, '账号或密码错误');
  if (user.status !== USER_STATUS.ACTIVE) throw new BusinessError(403, '账号已被禁用');

  await userDao.updateLastLogin(user.id);

  const token = generateToken(user);
  logger.info('[Auth] 登录成功', { userId: user.id });
  return {
    user: { id: user.id, nickname: user.nickname, role: user.role },
    token,
    token_expires_in: JWT_EXPIRES,
  };
}

export async function loginByCode({ phone, email, username, code }) {
  if (phone) {
    const result = await smsService.verifyCode(phone, 'login', code);
    if (!result.valid) throw new BusinessError(400, result.reason || '验证码无效');
  } else if (email) {
    await emailService.verifyCode(email, code);
  } else {
    throw new BusinessError(400, '验证码登录需提供手机号或邮箱');
  }

  let user;
  if (phone) {
    user = await userDao.findByPhone(phone);
  } else if (email) {
    user = await userDao.findByEmail(email);
  } else if (username) {
    user = await userDao.findByUsername(username);
  }

  if (!user) throw new BusinessError(401, '账号或验证码错误');
  if (user.status !== USER_STATUS.ACTIVE) throw new BusinessError(403, '账号已被禁用');

  await userDao.updateLastLogin(user.id);

  const token = generateToken(user);
  logger.info('[Auth] 验证码登录成功', { userId: user.id });
  return {
    user: { id: user.id, nickname: user.nickname, role: user.role },
    token,
    token_expires_in: JWT_EXPIRES,
  };
}

export async function resetPassword({ phone, email, newPassword, code }) {
  if (phone) {
    const result = await smsService.verifyCode(phone, 'reset_password', code);
    if (!result.valid) throw new BusinessError(400, result.reason || '验证码无效');
  } else if (email) {
    await emailService.verifyCode(email, code);
  } else {
    throw new BusinessError(400, '请提供手机号或邮箱');
  }

  const user = phone ? await userDao.findByPhone(phone) : await userDao.findByEmail(email);
  if (!user) throw new BusinessError(400, '密码重置失败，请检查输入信息');

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await userDao.updatePassword(user.id, passwordHash);

  const { revokeAllUserTokens } = await import('../utils/jwtToken.js');
  await revokeAllUserTokens(user.id);

  logger.info('[Auth] 密码重置成功', { userId: user.id });
  return { message: '密码重置成功' };
}

export async function getUserProfile(userId) {
  const user = await userDao.findById(userId);
  if (!user) throw new BusinessError(404, '用户不存在');
  return { user };
}
