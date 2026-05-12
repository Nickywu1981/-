/**
 * Movio AI v4.1 — Auth Routes
 * G5 后端开发 | POST /api/auth/*
 */
import { Router } from 'express';
import { z } from 'zod';
import { validateV4 as _validate } from '../utils/validate.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { optionalAuth } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';
import * as ctrl from '../controller/v4AuthController.js';

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

router.post('/register', authLimiter, _validate(registerSchema), ctrl.register);
router.post('/login', authLimiter, _validate(loginSchema), ctrl.login);
router.post('/login-by-code', authLimiter, _validate(loginByCodeSchema), ctrl.loginByCode);
router.post('/reset-password', authLimiter, _validate(resetPasswordSchema), ctrl.resetPassword);
router.post('/logout', authLimiter, csrfProtection, optionalAuth, ctrl.logout);

export default router;
