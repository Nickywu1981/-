import { BusinessError } from '../utils/businessError.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../dao/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'movio-jwt-secret-dev-32bytes!!';
const JWT_EXPIRES = 7 * 24 * 60 * 60;

function generateToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, nickname: user.nickname },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES },
  );
}

export async function register({ phone, email, password, nickname, inviteCode }) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 用 phone 或 email 作为账号唯一标识(username)
    const username = phone || email || '';
    if (!username) throw new BusinessError(400, '请提供手机号或邮箱');

    const [existing] = await conn.query('SELECT id FROM `user` WHERE username = ?', [username]);
    if (existing.length > 0) throw new BusinessError(409, '该账号已注册');

    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await conn.query(
      `INSERT INTO user (username, password, nickname, phone, email, role, status)
       VALUES (?, ?, ?, ?, ?, 'free', 1)`,
      [username, passwordHash, nickname || '', phone || '', email || ''],
    );
    const userId = result.insertId;

    await conn.commit();

    const user = { id: userId, role: 'free', nickname: nickname || '' };
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

export async function login({ phone, email, password }) {
  const conn = await db.getConnection();
  try {
    const username = phone || email || '';
    if (!username) throw new BusinessError(400, '请提供手机号或邮箱');

    const [users] = await conn.query(
      'SELECT id, password, role, nickname, status FROM `user` WHERE username = ?',
      [username],
    );

    if (!users || users.length === 0) throw new BusinessError(401, '账号或密码错误');
    const user = users[0];

    if (user.status !== 1) throw new BusinessError(403, '账号已被禁用');

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) throw new BusinessError(401, '账号或密码错误');

    await conn.query('UPDATE `user` SET last_login_time = NOW() WHERE id = ?', [user.id]);

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
  const conn = await db.getConnection();
  try {
    const username = phone || email || '';
    if (!username) throw new BusinessError(400, '请提供手机号或邮箱');

    const [users] = await conn.query(
      'SELECT id, role, nickname, status FROM `user` WHERE username = ?',
      [username],
    );

    if (!users || users.length === 0) throw new BusinessError(401, '账号不存在，请先注册');
    const user = users[0];

    if (user.status !== 1) throw new BusinessError(403, '账号已被禁用');

    await conn.query('UPDATE `user` SET last_login_time = NOW() WHERE id = ?', [user.id]);

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
  const conn = await db.getConnection();
  try {
    const username = phone || email || '';
    if (!username) throw new BusinessError(400, '请提供手机号或邮箱');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    const [result] = await conn.query(
      'UPDATE `user` SET password = ? WHERE username = ?',
      [passwordHash, username],
    );

    if (result.affectedRows === 0) throw new BusinessError(404, '账号不存在');
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
