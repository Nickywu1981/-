import { Router } from 'express';
import {
  sendVerificationCode, verifyCode,
  listTemplates, updateTemplate, createTemplate, deleteTemplate,
} from '../controller/emailController.js';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { codeLimiter } from '../middleware/rateLimiter.js';
import { validate, emailSchema, codeSchema } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const sendCodeSchema = z.object({ email: emailSchema, scene: z.enum(['register', 'login', 'reset_password', 'bind']) });
const verifyCodeSchema = z.object({ email: emailSchema, code: codeSchema });

// 公开 — 验证码收发
router.post('/send-code', codeLimiter, validate(sendCodeSchema), asyncHandler(sendVerificationCode));
router.post('/verify-code', codeLimiter, validate(verifyCodeSchema), asyncHandler(verifyCode));

// 管理后台 — 模板管理
router.get('/templates', authMiddleware, adminAuth, asyncHandler(listTemplates));
router.post('/templates', authMiddleware, adminAuth, asyncHandler(createTemplate));
router.put('/templates/:id', authMiddleware, adminAuth, asyncHandler(updateTemplate));
router.delete('/templates/:id', authMiddleware, adminAuth, asyncHandler(deleteTemplate));

export default router;
