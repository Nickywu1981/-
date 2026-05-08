/**
 * Movio AI v4.1 — Auth Routes / Controller
 * G5 后端开发 | POST /api/auth/*
 */
import { Router } from 'express';
import { z } from 'zod';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import * as authService from '../services/auth.service.js';

const router = Router();

const _phoneRegex = /^1[3-9]\d{9}$/;

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
  password: z.string().min(1, '请填写密码'),
}).refine(d => d.phone || d.email, { message: '请填写手机号或邮箱' });

const loginByCodeSchema = z.object({
  phone: z.string().regex(_phoneRegex).optional().nullable(),
  email: z.string().email().optional().nullable(),
}).refine(d => d.phone || d.email, { message: '请提供手机号或邮箱' });

const resetPasswordSchema = z.object({
  phone: z.string().regex(_phoneRegex).optional().nullable(),
  email: z.string().email().optional().nullable(),
  new_password: z.string().min(8, '新密码至少8位').max(64),
}).refine(d => d.phone || d.email, { message: '手机号或邮箱至少填一项' });

function _validate(schema) {
  return (req, res, next) => {
    const r = schema.safeParse(req.body);
    if (!r.success) {
      const msg = r.error.errors.map(e => e.message).join('; ');
      return error(res, ERROR_CODE.VALIDATION_ERROR, msg);
    }
    req.validated = r.data;
    next();
  };
}

// POST /api/auth/register
router.post('/register', _validate(registerSchema), async (req, res) => {
  try {
    const { phone, email, password, nickname, invite_code } = req.validated;

    const result = await authService.register({
      phone, email, password, nickname, inviteCode: invite_code,
    });

    // 设置 cookie
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: result.token_expires_in * 1000,
    });

    return success(res, result.user, '注册成功');
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message || '注册失败', err.status || 500);
  }
});

// POST /api/auth/login
router.post('/login', _validate(loginSchema), async (req, res) => {
  try {
    const { phone, email, password } = req.validated;

    const result = await authService.login({ phone, email, password });

    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: result.token_expires_in * 1000,
    });

    return success(res, result.user, '登录成功');
  } catch (err) {
    return error(res, err.status || ERROR_CODE.UNAUTHORIZED, err.message || '登录失败', err.status || 401);
  }
});

// POST /api/auth/login-by-code — 短信/邮箱验证码登录
router.post('/login-by-code', _validate(loginByCodeSchema), async (req, res) => {
  try {
    const { phone, email } = req.validated;
    if (!phone && !email) {
      return error(res, ERROR_CODE.VALIDATION_ERROR, '请提供手机号或邮箱');
    }

    const result = await authService.loginByCode({ phone, email });

    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: result.token_expires_in * 1000,
    });

    return success(res, result.user, '登录成功');
  } catch (err) {
    return error(res, err.status || ERROR_CODE.UNAUTHORIZED, err.message || '登录失败', err.status || 401);
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', _validate(resetPasswordSchema), async (req, res) => {
  try {
    const { phone, email, new_password } = req.validated;

    const result = await authService.resetPassword({ phone, email, newPassword: new_password });
    return success(res, result, '密码重置成功');
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message || '重置失败', err.status || 500);
  }
});

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  res.clearCookie('token');
  return success(res, {}, '已退出登录');
});

export default router;
