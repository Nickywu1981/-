import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { USER_STATUS } from '../constants/domainStatus.js';
import bcrypt from 'bcryptjs';
import * as userDao from '../dao/userDao.js';
import { generateAccessToken } from '../middleware/auth.js';
import { jwtExpiresIn } from '../config/index.js';
import logger from '../utils/logger.js';

const SALT_ROUNDS = 12;

// ── 账号级爆破防护 ──
const loginFailures = new Map();
const MAX_FAILURES = 5;
const LOCKOUT_MINUTES = 15;

function checkLockout(identifier) {
  const record = loginFailures.get(identifier);
  if (!record) return;
  if (record.lockedUntil && Date.now() < record.lockedUntil) {
    const remaining = Math.ceil((record.lockedUntil - Date.now()) / 60000);
    throw new BusinessError(ERROR_CODE.TOO_MANY_REQUESTS, `账号已锁定，${remaining}分钟后重试`);
  }
  if (record.lockedUntil && Date.now() >= record.lockedUntil) {
    loginFailures.delete(identifier);
  }
}

function recordLoginFailure(identifier) {
  const now = Date.now();
  const record = loginFailures.get(identifier) || { count: 0, firstAttempt: now };
  record.count++;
  if (record.count >= MAX_FAILURES) {
    record.lockedUntil = now + LOCKOUT_MINUTES * 60 * 1000;
    logger.warn('[Auth] 账号锁定', { identifier: identifier.substring(0, 20), cnt: record.count });
  }
  loginFailures.set(identifier, record);
}

function clearLoginFailures(identifier) {
  loginFailures.delete(identifier);
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of loginFailures) {
    if (v.lockedUntil && now >= v.lockedUntil) loginFailures.delete(k);
  }
}, 30 * 60 * 1000);
import * as smsService from './smsService.js';

/**
 * 根据用户角色映射到三端 audience (Decision 025)
 * admin/super_admin → admin (平台总后台)
 * ops_admin/ops_viewer/finance → ops (运营业务后台)
 * enterprise → enterprise (企业端)
 * 其余 → consumer (统一用户工作台)
 */
function getAudience(role) {
  if (['admin', 'super_admin'].includes(role)) return 'admin';
  if (['ops_admin', 'ops_viewer', 'finance'].includes(role)) return 'ops';
  if (role === 'enterprise') return 'enterprise';
  return 'consumer';
}
import * as emailService from './emailService.js';

export async function register({ phone, email, password, nickname, inviteCode: _inviteCode }) {
  const username = phone || email || '';
  if (!username) throw new BusinessError(ERROR_CODE.PARAM_MISSING);

  const [byPhone, byEmail] = await Promise.all([
    phone ? userDao.findByPhone(phone) : null,
    email ? userDao.findByEmail(email) : null,
  ]);
  if (byPhone || byEmail) throw new BusinessError(ERROR_CODE.PARAM_ERROR);

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const userId = await userDao.createUser({ phone: phone || '', email: email || '', password: passwordHash, nickname: nickname || '' });

  logger.info('[Auth] 注册成功', { userId });

  const user = { id: userId, role: 'free', nickname: nickname || '', tenantId: 0, audience: getAudience('free') };
  const token = generateAccessToken(user);

  return {
    user: { id: userId, nickname: nickname || '', role: 'free' },
    token,
    token_expires_in: jwtExpiresIn,
  };
}

export async function login({ phone, email, username, password }) {
  const identifier = username || phone || email || '';
  if (!identifier) throw new BusinessError(ERROR_CODE.PARAM_MISSING);

  const user = await userDao.findByUsername(identifier);

  // Prevent timing-based account enumeration: always run bcrypt
  const DUMMY = '$2a$12$abcdefghijklmnopqrstuvabcdefghijklmnopqrstuv34567890123';
  const validPassword = await bcrypt.compare(password, user ? user.password : DUMMY);

  if (!user || !validPassword) {
    recordLoginFailure(identifier);
    throw new BusinessError(ERROR_CODE.PASSWORD_WRONG);
  }
  if (user.status !== USER_STATUS.ACTIVE) throw new BusinessError(ERROR_CODE.ACCOUNT_DISABLED);

  clearLoginFailures(identifier);
  await userDao.updateLastLogin(user.id);

  user.audience = getAudience(user.role);  // Decision 025: 三端按角色映射
  const token = generateAccessToken(user);
  logger.info('[Auth] 登录成功', { userId: user.id });
  return {
    user: { id: user.id, nickname: user.nickname, role: user.role },
    token,
    token_expires_in: jwtExpiresIn,
  };
}

export async function loginByCode({ phone, email, username, code }) {
  if (phone) {
    const result = await smsService.verifyCode(phone, 'login', code);
    if (!result.valid) throw new BusinessError(ERROR_CODE.PARAM_INVALID, result.reason || 'Invalid verification code');
  } else if (email) {
    await emailService.verifyCode(email, code);
  } else {
    throw new BusinessError(ERROR_CODE.PARAM_MISSING);
  }

  let user;
  if (phone) {
    user = await userDao.findByPhone(phone);
  } else if (email) {
    user = await userDao.findByEmail(email);
  } else if (username) {
    user = await userDao.findByUsername(username);
  }

  if (!user) throw new BusinessError(ERROR_CODE.PASSWORD_WRONG);
  if (user.status !== USER_STATUS.ACTIVE) throw new BusinessError(ERROR_CODE.ACCOUNT_DISABLED);

  await userDao.updateLastLogin(user.id);

  user.audience = getAudience(user.role);  // Decision 025
  const token = generateAccessToken(user);
  logger.info('[Auth] 验证码登录成功', { userId: user.id });
  return {
    user: { id: user.id, nickname: user.nickname, role: user.role },
    token,
    token_expires_in: jwtExpiresIn,
  };
}

export async function resetPassword({ phone, email, newPassword, code }) {
  if (phone) {
    const result = await smsService.verifyCode(phone, 'reset_password', code);
    if (!result.valid) throw new BusinessError(ERROR_CODE.PARAM_INVALID, result.reason || 'Invalid verification code');
  } else if (email) {
    await emailService.verifyCode(email, code);
  } else {
    throw new BusinessError(ERROR_CODE.PARAM_MISSING);
  }

  const user = phone ? await userDao.findByPhone(phone) : await userDao.findByEmail(email);
  if (!user) throw new BusinessError(ERROR_CODE.PARAM_ERROR);

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await userDao.updatePassword(user.id, passwordHash);

  // Revoke all existing tokens (Redis). This is best-effort — if Redis is
  // unavailable, old tokens remain valid until their natural TTL expiry.
  const { revokeAllUserTokens } = await import('../utils/jwtToken.js');
  try {
    await revokeAllUserTokens(user.id);
  } catch (e) {
    logger.error('[Auth] Token revocation failed after password reset', { userId: user.id, error: e.message });
  }

  logger.info('[Auth] Password reset successful', { userId: user.id });
  return { code: ERROR_CODE.PASSWORD_RESET_OK, message: 'Password reset successful' };
}

export async function getUserProfile(userId) {
  const user = await userDao.findById(userId);
  if (!user) throw new BusinessError(ERROR_CODE.USER_NOT_FOUND);
  return { user };
}
