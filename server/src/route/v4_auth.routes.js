/**
 * Movio AI v4.1 — Auth Routes / Controller
 * G5 后端开发 | POST /api/auth/*
 */
import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { success, error } from '../utils/response.js';
import { validateV4 as _validate } from '../utils/validate.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { generateRefreshToken } from '../middleware/auth.js';
import * as authService from '../services/auth.service.js';
import { revokeAccessToken, revokeRefreshToken } from '../utils/jwtToken.js';

const router = Router();

const _phoneRegex = /^1[3-9]\d{9}$/;

function _setTokenCookie(res, token) {
  const payload = jwt.decode(token);
  const maxAge = payload?.exp ? (payload.exp * 1000) - Date.now() : 7 * 24 * 60 * 60 * 1000;
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge,
  });
}

function _setRefreshCookie(res, userId) {
  const refreshToken = generateRefreshToken({ userId });
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

const registerSchema = z.object({
  phone: z.string().regex(_phoneRegex, '手机号格式不正确').optional().nullable(),
  email: z.string().email('邮箱格式不正确').optional().nullable(),
  password: z.string().min(8, '密码至少8位').max(64),
  nickname: z.string().max(30).optional(),
  invite_code: z.string().max(20).optional(),
}).refine(d => d.phone || d.email, { message: '手机号或邮箱至少填一项' });

const loginSchema = z.object({
  phone: z.string().regex(_phoneRegex).optional().nullable(),
  email: z.string().email().optional().nullable(),
  username: z.string().min(1).max(100).optional().nullable(),
  account: z.string().min(1).max(100).optional().nullable(),
  password: z.string().min(1, '请填写密码'),
}).refine(d => d.phone || d.email || d.username || d.account, { message: '请填写手机号、邮箱或用户名' });

const loginByCodeSchema = z.object({
  phone: z.string().regex(_phoneRegex).optional().nullable(),
  email: z.string().email().optional().nullable(),
  username: z.string().min(1).max(100).optional().nullable(),
  code: z.string().length(6, '验证码为6位数字'),
}).refine(d => d.phone || d.email || d.username, { message: '请提供手机号、邮箱或用户名' });

const resetPasswordSchema = z.object({
  phone: z.string().regex(_phoneRegex).optional().nullable(),
  email: z.string().email().optional().nullable(),
  new_password: z.string().min(8, '新密码至少8位').max(64),
  code: z.string().length(6, '验证码为6位数字'),
}).refine(d => d.phone || d.email, { message: '手机号或邮箱至少填一项' });

// POST /api/auth/register
router.post('/register', authLimiter, _validate(registerSchema), async (req, res) => {
  try {
    const { phone, email, password, nickname, invite_code } = req.validated;

    const result = await authService.register({
      phone, email, password, nickname, inviteCode: invite_code,
    });

    // 设置 cookie
    _setTokenCookie(res, result.token);
    _setRefreshCookie(res, result.user.id);

    return success(res, { ...result.user, token: result.token, token_expires_in: result.token_expires_in }, '注册成功');
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.status ? err.message : '注册失败');
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, _validate(loginSchema), async (req, res) => {
  try {
    const { phone, email, username, account, password } = req.validated;

    const result = await authService.login({ phone, email, username: username || account, password });

    _setTokenCookie(res, result.token);
    _setRefreshCookie(res, result.user.id);

    return success(res, { ...result.user, token: result.token, token_expires_in: result.token_expires_in }, '登录成功');
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.status ? err.message : '登录失败');
  }
});

// POST /api/auth/login-by-code — 短信/邮箱验证码登录
router.post('/login-by-code', authLimiter, _validate(loginByCodeSchema), async (req, res) => {
  try {
    const { phone, email, username, code } = req.validated;
    if (!phone && !email && !username) {
      return error(res, ERROR_CODE.VALIDATION_ERROR, '请提供手机号、邮箱或用户名');
    }

    const result = await authService.loginByCode({ phone, email, username, code });

    _setTokenCookie(res, result.token);
    _setRefreshCookie(res, result.user.id);

    return success(res, { ...result.user, token: result.token, token_expires_in: result.token_expires_in }, '登录成功');
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.status ? err.message : '登录失败');
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', authLimiter, _validate(resetPasswordSchema), async (req, res) => {
  try {
    const { phone, email, new_password, code } = req.validated;

    const result = await authService.resetPassword({ phone, email, newPassword: new_password, code });
    return success(res, result, '密码重置成功');
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.status ? err.message : '重置失败');
  }
});

// POST /api/auth/logout
router.post('/logout', authLimiter, async (req, res) => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try { await revokeAccessToken(header.slice(7)); } catch { /* best-effort */ }
  }
  const rt = req.cookies?.refreshToken;
  if (rt) {
    try { await revokeRefreshToken(rt); } catch { /* best-effort */ }
    res.clearCookie('refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
  }
  res.clearCookie('token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
  return success(res, {}, '已退出登录');
});

export default router;
