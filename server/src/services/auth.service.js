import { BusinessError } from '../utils/businessError.js';
import { USER_STATUS } from '../constants/domainStatus.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../dao/db.js';
import { jwtSecret as JWT_SECRET, jwtExpiresIn as JWT_EXPIRES } from '../config/index.js';
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
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 用 phone 或 email 作为账号唯一标识(username)
    const username = phone || email || '';
    if (!username) throw new BusinessError(400, '请提供手机号或邮箱');

    const [existing] = await conn.query('SELECT id FROM `user` WHERE username = ?', [username]);
    if (existing.length > 0) throw new BusinessError(400, '注册失败，请检查输入信息');

    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await conn.query(
      `INSERT INTO user (username, password, nickname, phone, email, role, status)
       VALUES (?, ?, ?, ?, ?, 'user', 1)`,
      [username, passwordHash, nickname || '', phone || '', email || ''],
    );
    const userId = result.insertId;

    await conn.commit();
    logger.info('[Auth] 注册成功', { userId });

    const user = { id: userId, role: 'free', nickname: nickname || '', tenantId: 0 };
    const token = generateToken(user);

    return {
      user: { id: userId, nickname: nickname || '', role: 'free' },
      token,
      token_expires_in: JWT_EXPIRES,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function login({ phone, email, username, password }) {
  const conn = await db.getConnection();
  try {
    const identifier = username || phone || email || '';
    if (!identifier) throw new BusinessError(400, '请提供手机号、邮箱或用户名');

    const [users] = await conn.query(
      'SELECT id, tenant_id, password, role, nickname, status FROM `user` WHERE username = ?',
      [identifier],
    );

    const user = users?.[0] || null;

    // Prevent timing-based account enumeration: always run bcrypt
    const DUMMY = '$2a$12$abcdefghijklmnopqrstuvabcdefghijklmnopqrstuv34567890123';
    const validPassword = await bcrypt.compare(password, user ? user.password : DUMMY);

    if (!user || !validPassword) throw new BusinessError(401, '账号或密码错误');
    if (user.status !== USER_STATUS.ACTIVE) throw new BusinessError(403, '账号已被禁用');

    await conn.query('UPDATE `user` SET last_login_time = NOW() WHERE id = ?', [user.id]);

    const token = generateToken(user);
    logger.info('[Auth] 登录成功', { userId: user.id });
    return {
      user: { id: user.id, nickname: user.nickname, role: user.role },
      token,
      token_expires_in: JWT_EXPIRES,
    };
  } finally {
    conn.release();
  }
}

export async function loginByCode({ phone, email, username, code }) {
  // 验证码校验：优先手机号，其次邮箱
  if (phone) {
    const result = await smsService.verifyCode(phone, 'login', code);
    if (!result.valid) throw new BusinessError(400, result.reason || '验证码无效');
  } else if (email) {
    await emailService.verifyCode(email, code); // throws on invalid
  } else {
    throw new BusinessError(400, '验证码登录需提供手机号或邮箱');
  }

  const conn = await db.getConnection();
  try {
    // 根据验证渠道查找用户：手机验证→按手机查，邮箱验证→按邮箱查，否则按用户名
    let identifier, idField;
    if (phone) {
      identifier = phone;
      idField = 'phone';
    } else if (email) {
      identifier = email;
      idField = 'email';
    } else if (username) {
      identifier = username;
      idField = 'username';
    } else {
      throw new BusinessError(400, '请提供手机号、邮箱或用户名');
    }

    // 白名单校验 idField 防动态列名注入（即使当前代码安全，加固未来重构）
    const ALLOWED = ['phone', 'email', 'username'];
    if (!ALLOWED.includes(idField)) throw new BusinessError(400, '请提供手机号、邮箱或用户名');

    const [users] = await conn.query(
      `SELECT id, tenant_id, role, nickname, status FROM \`user\` WHERE ${idField} = ?`,
      [identifier],
    );

    if (!users || users.length === 0) throw new BusinessError(401, '账号或验证码错误');
    const user = users[0];

    if (user.status !== USER_STATUS.ACTIVE) throw new BusinessError(403, '账号已被禁用');

    await conn.query('UPDATE `user` SET last_login_time = NOW() WHERE id = ?', [user.id]);

    const token = generateToken(user);
    logger.info('[Auth] 验证码登录成功', { userId: user.id });
    return {
      user: { id: user.id, nickname: user.nickname, role: user.role },
      token,
      token_expires_in: JWT_EXPIRES,
    };
  } finally {
    conn.release();
  }
}

export async function resetPassword({ phone, email, newPassword, code }) {
  // 验证码校验
  if (phone) {
    const result = await smsService.verifyCode(phone, 'reset_password', code);
    if (!result.valid) throw new BusinessError(400, result.reason || '验证码无效');
  } else if (email) {
    await emailService.verifyCode(email, code); // throws on invalid
  }

  const conn = await db.getConnection();
  try {
    const username = phone || email || '';
    if (!username) throw new BusinessError(400, '请提供手机号或邮箱');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    const [result] = await conn.query(
      'UPDATE `user` SET password = ? WHERE username = ?',
      [passwordHash, username],
    );

    if (result.affectedRows === 0) throw new BusinessError(400, '密码重置失败，请检查输入信息');
    // Revoke all existing tokens after password reset
    const [userRow] = await conn.query('SELECT id FROM `user` WHERE username = ?', [username]);
    if (userRow.length > 0) {
      const { revokeAllUserTokens } = await import('../utils/jwtToken.js');
      await revokeAllUserTokens(userRow[0].id);
    }
    logger.info('[Auth] 密码重置成功', { userId: userRow[0]?.id, username });
    return { message: '密码重置成功' };
  } finally {
    conn.release();
  }
}

export async function getUserProfile(userId) {
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.query(
      'SELECT id, phone, email, nickname, avatar, role, status, create_time, last_login_time FROM `user` WHERE id = ?',
      [userId],
    );
    if (rows.length === 0) throw new BusinessError(404, '用户不存在');
    return { user: rows[0] };
  } finally {
    conn.release();
  }
}
