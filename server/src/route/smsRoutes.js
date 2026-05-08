import { Router } from 'express';
import {
  sendVerificationCode, verifyCode, listTemplates,
  updateTemplate, createTemplate, deleteTemplate, listLogs, sendNotification,
} from '../controller/smsController.js';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { codeLimiter } from '../middleware/rateLimiter.js';
import { validate, phoneSchema, codeSchema } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const sendCodeSchema = z.object({
  phone: phoneSchema,
  scene: z.enum(['register', 'login', 'reset_password', 'bind']),
});
const verifyCodeSchema = z.object({
  phone: phoneSchema,
  scene: z.enum(['register', 'login', 'reset_password', 'bind']),
  code: codeSchema,
});
const sendNotificationSchema = z.object({
  phone: phoneSchema,
  scene: z.string().optional(),
  templateCode: z.string().optional(),
  params: z.record(z.string()).optional(),
});

// 公开 — 验证码收发
router.post('/send-code', codeLimiter, validate(sendCodeSchema), asyncHandler(sendVerificationCode));
router.post('/verify-code', codeLimiter, validate(verifyCodeSchema), asyncHandler(verifyCode));

// 登录用户 — 手动触发通知短信
router.post('/send', authMiddleware, validate(sendNotificationSchema), asyncHandler(sendNotification));

// 管理后台 — 模板管理 + 日志
router.get('/templates', authMiddleware, adminAuth, asyncHandler(listTemplates));
router.post('/templates', authMiddleware, adminAuth, asyncHandler(createTemplate));
router.put('/templates/:id', authMiddleware, adminAuth, asyncHandler(updateTemplate));
router.delete('/templates/:id', authMiddleware, adminAuth, asyncHandler(deleteTemplate));
router.get('/logs', authMiddleware, adminAuth, asyncHandler(listLogs));

export default router;
