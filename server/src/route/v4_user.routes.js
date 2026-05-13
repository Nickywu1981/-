/**
 * Movio AI v4.1 — User Routes
 * G5 后端开发 | W4
 */
import { Router } from 'express';
import { z } from 'zod';
import { validateV4 as _validate } from '../utils/validate.js';
import { heavyLimiter, authLimiter } from '../middleware/rateLimiter.js';
import * as ctrl from '../controller/v4UserController.js';

const router = Router();

const _phoneRegex = /^1[3-9]\d{9}$/;

const updateProfileSchema = z.object({
  nickname: z.string().max(30).optional(),
  phone: z.string().regex(_phoneRegex, '手机号格式不正确').optional().nullable(),
  email: z.string().email('邮箱格式不正确').optional().nullable(),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, '请提供原密码').max(128),
  newPassword: z.string().min(8, '新密码至少8位').max(64),
});


router.get('/profile', ctrl.getProfile);
router.get('/stats', ctrl.getStats);
router.put('/profile', heavyLimiter, _validate(updateProfileSchema), ctrl.updateProfile);
router.put('/change-password', authLimiter, heavyLimiter, _validate(changePasswordSchema), ctrl.changePassword);
router.put('/membership/auto-renew', heavyLimiter, _validate(z.object({
  autoRenew: z.boolean(),
})), ctrl.toggleAutoRenew);

export default router;
