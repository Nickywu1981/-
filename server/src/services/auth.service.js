/**
 * Movio AI v4.1 — Auth Service
 * G5 后端开发 | T-G5-001
 * 注册/登录/密码重置, bcrypt + JWT, 邀请码分销绑定
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from '../dao/db.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import { checkVerified as smsVerified } from './smsService.js';
import { checkVerified as emailVerified } from './emailService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'movio-jwt-secret-dev';
const JWT_EXPIRES = 7 * 24 * 60 * 60; // 7天

function generateToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, nickname: user.nickname },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

function generateInviteCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase(); // 8位
}

export async function register({ phone, email, password, nickname, inviteCode }) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 校验唯一性
    if (phone) {
      const encPhone = encrypt(phone);
      const [existing] = await conn.query('SELECT id FROM users WHERE phone = ?', [encPhone]);
      if (existing.length > 0) throw { status: 409, message: '该手机号已注册' };
    }
    if (email) {
      const encEmail = encrypt(email);
      const [existing] = await conn.query('SELECT id FROM users WHERE email = ?', [encEmail]);
      if (existing.length > 0) throw { status: 409, message: '该邮箱已注册' };
    }

    // 生成邀请码
    let myInviteCode;
    let attempts = 0;
    do {
      myInviteCode = generateInviteCode();
      const [dup] = await conn.query('SELECT id FROM users WHERE invite_code = ?', [myInviteCode]);
      if (dup.length === 0) break;
      attempts++;
    } while (attempts < 10);

    // 创建用户
    const passwordHash = await bcrypt.hash(password, 12);
    const freePoints = 50; // 注册赠送积分 (从 biz.free_trial 配置读取)
    const [result] = await conn.query(
      `INSERT INTO users (phone, email, password_hash, nickname, role, invite_code, points_balance, free_trial_used)
       VALUES (?, ?, ?, ?, 'free', ?, ?, 1)`,
      [
        phone ? encrypt(phone) : '',
        email ? encrypt(email) : '',
        passwordHash,
        nickname || '',
        myInviteCode,
        freePoints,
      ]
    );
    const userId = result.insertId;

    // 积分账户初始化
    await conn.query(
      'INSERT INTO points_account (user_id, balance, total_earned) VALUES (?, ?, ?)',
      [userId, freePoints, freePoints]
    );
    await conn.query(
      'INSERT INTO points_transaction (user_id, trans_type, amount, balance_after, business_type, remark) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, 'earn', freePoints, freePoints, 'register_gift', '注册赠送积分']
    );

    // 邀请码绑定分销关系
    if (inviteCode) {
      const [inviter] = await conn.query('SELECT id FROM users WHERE invite_code = ?', [inviteCode]);
      if (inviter.length > 0) {
        const parentId = inviter[0].id;
        await conn.query(
          'INSERT INTO distributor_relation (user_id, parent_id, level, invite_code) VALUES (?, ?, 1, ?)',
          [userId, parentId, inviteCode]
        );
        // 更新用户 invited_by
        await conn.query('UPDATE users SET invited_by = ? WHERE id = ?', [parentId, userId]);
        // 检查上上级 (间推)
        const [grandparent] = await conn.query('SELECT parent_id FROM distributor_relation WHERE user_id = ? AND level = 1', [parentId]);
        if (grandparent.length > 0) {
          await conn.query(
            'INSERT INTO distributor_relation (user_id, parent_id, grandparent_id, level, invite_code) VALUES (?, ?, ?, 2, ?)',
            [userId, grandparent[0].parent_id, parentId, inviteCode]
          );
        }
      }
    }

    await conn.commit();

    const user = { id: userId, role: 'free', nickname: nickname || '' };
    const token = generateToken(user);

    return {
      user: { id: userId, nickname: nickname || '', role: 'free', invite_code: myInviteCode },
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

export async function login({ phone, email, password }) {
  const conn = await db.getConnection();
  try {
    let user;
    if (phone) {
      const encPhone = encrypt(phone);
      [user] = await conn.query(
        'SELECT id, password_hash, role, nickname, status FROM users WHERE phone = ?',
        [encPhone]
      );
    } else if (email) {
      const encEmail = encrypt(email);
      [user] = await conn.query(
        'SELECT id, password_hash, role, nickname, status FROM users WHERE email = ?',
        [encEmail]
      );
    }

    if (!user || user.length === 0) throw { status: 401, message: '账号或密码错误' };
    user = user[0];

    if (user.status !== 'active') throw { status: 403, message: '账号已被禁用' };

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) throw { status: 401, message: '账号或密码错误' };

    // 更新最后登录时间
    await conn.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

    const token = generateToken(user);
    return {
      user: { id: user.id, nickname: user.nickname, role: user.role },
      token,
      token_expires_in: JWT_EXPIRES,
    };
  } finally {
    conn.release();
  }
}

export async function loginByCode({ phone, email }) {
  // 验证码登录：先检查验证标记，通过后签发 JWT
  if (phone) {
    if (!smsVerified(phone)) throw { status: 401, message: '验证已过期，请重新验证' };
  } else if (email) {
    if (!emailVerified(email)) throw { status: 401, message: '验证已过期，请重新验证' };
  } else {
    throw { status: 400, message: '请提供手机号或邮箱' };
  }

  const conn = await db.getConnection();
  try {
    let user;
    if (phone) {
      const encPhone = encrypt(phone);
      [user] = await conn.query(
        'SELECT id, role, nickname, status FROM users WHERE phone = ?',
        [encPhone]
      );
    } else {
      const encEmail = encrypt(email);
      [user] = await conn.query(
        'SELECT id, role, nickname, status FROM users WHERE email = ?',
        [encEmail]
      );
    }

    if (!user || user.length === 0) throw { status: 401, message: '账号不存在，请先注册' };
    user = user[0];

    if (user.status !== 'active') throw { status: 403, message: '账号已被禁用' };

    await conn.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

    const token = generateToken(user);
    return {
      user: { id: user.id, nickname: user.nickname, role: user.role },
      token,
      token_expires_in: JWT_EXPIRES,
    };
  } finally {
    conn.release();
  }
}

export async function resetPassword({ phone, email, newPassword }) {
  // 必须通过短信/邮箱验证后才能重置密码
  if (phone) {
    if (!smsVerified(phone)) throw { status: 401, message: '验证已过期，请重新验证' };
  } else if (email) {
    if (!emailVerified(email)) throw { status: 401, message: '验证已过期，请重新验证' };
  } else {
    throw { status: 400, message: '请提供手机号或邮箱' };
  }

  const conn = await db.getConnection();
  try {
    let field, encValue;
    if (phone) { field = 'phone'; encValue = encrypt(phone); }
    else if (email) { field = 'email'; encValue = encrypt(email); }
    else throw { status: 400, message: '请提供手机号或邮箱' };

    const passwordHash = await bcrypt.hash(newPassword, 12);
    const [result] = await conn.query(
      `UPDATE users SET password_hash = ? WHERE ${field} = ?`,
      [passwordHash, encValue]
    );

    if (result.affectedRows === 0) throw { status: 404, message: '账号不存在' };
    return { message: '密码重置成功' };
  } finally {
    conn.release();
  }
}

export async function getUserProfile(userId) {
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.query(
      'SELECT id, phone, email, nickname, avatar_url, role, status, invite_code, points_balance, invited_by, created_at, last_login_at FROM users WHERE id = ?',
      [userId]
    );
    if (rows.length === 0) throw { status: 404, message: '用户不存在' };

    const user = rows[0];
    // 解密敏感字段
    if (user.phone) user.phone = decrypt(user.phone);
    if (user.email) user.email = decrypt(user.email);

    return { user };
  } finally {
    conn.release();
  }
}
