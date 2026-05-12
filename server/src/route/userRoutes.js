import { Router } from 'express';
import { register, login, profile, updateProfile, changePassword, forgotPassword, resetPassword, getStats, refreshToken, logout, logoutAll } from '../controller/userController.js';
import { authMiddleware, refreshTokenMiddleware } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { setCsrfCookie } from '../middleware/csrf.js';
import { validate, passwordSchema, phoneSchema } from '../utils/validate.js';
import { success } from '../utils/response.js';
import { z } from 'zod';

const router = Router();

const registerSchema = z.object({
  username: z.string().min(2, '用户名至少2个字符').max(30),
  password: passwordSchema,
  nickname: z.string().max(50).optional(),
});

const loginSchema = z.object({
  username: z.string().optional(),
  account: z.string().optional(),
  email: z.string().email('邮箱格式错误').optional(),
  password: z.string().min(1, '请输入密码').max(128),
}).refine(d => d.username || d.account || d.email, { message: '请提供用户名/邮箱' });

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, '请输入旧密码').max(128),
  newPassword: passwordSchema,
});

const forgotPasswordSchema = z.object({
  username: z.string().min(1, '请输入用户名').max(100),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, '请提供 refreshToken').max(500),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, '缺少重置令牌').max(500),
  newPassword: passwordSchema,
});

const updateProfileSchema = z.object({
  nickname: z.string().min(2).max(30).optional(),
  phone: phoneSchema.optional().or(z.literal('')),
  email: z.string().email().max(200).optional(),
  avatar: z.string().optional(),
});

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), setCsrfCookie, login);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), resetPassword);

// 获取 CSRF Token（SPA 首次加载时调用）
router.get('/csrf-token', setCsrfCookie, (_req, res) => success(res, null, 'ok'));

// 需要认证
router.get('/profile', authMiddleware, profile);
router.put('/profile', authMiddleware, validate(updateProfileSchema), updateProfile);
router.put('/password', authMiddleware, validate(changePasswordSchema), changePassword);
router.get('/stats', authMiddleware, getStats);

// JWT 双令牌 — refresh 使用 refreshTokenMiddleware 校验 httpOnly cookie
router.post('/refresh', setCsrfCookie, validate(refreshTokenSchema), refreshTokenMiddleware, refreshToken);
router.post('/logout', authMiddleware, logout);
router.post('/logout-all', authMiddleware, logoutAll);

export default router;
