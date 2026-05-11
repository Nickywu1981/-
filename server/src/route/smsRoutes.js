import { Router } from 'express';
import {
  sendVerificationCode, verifyCode, listTemplates,
  updateTemplate, createTemplate, deleteTemplate, listLogs, sendNotification,
} from '../controller/smsController.js';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate, phoneSchema, codeSchema } from '../utils/validate.js';
import { codeLimiter, verifyLimiter } from '../middleware/rateLimiter.js';
import { z } from 'zod';

const router = Router();

const idParamSchema = z.object({ id: z.string().regex(/^\d+$/).transform(Number) });

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

const smsTemplateSchema = z.object({
  template_code: z.string().min(1, '模板代码不能为空').max(50).regex(/^[a-z][a-z0-9_]*$/, '仅允许小写字母数字下划线'),
  name: z.string().min(1, '模板名称不能为空').max(100),
  content: z.string().min(1, '模板内容不能为空').max(500),
  provider_template_id: z.string().max(100).optional(),
  provider: z.string().max(50).optional(),
  status: z.coerce.number().int().min(0).max(1).optional(),
  remark: z.string().max(500).optional(),
});
const smsTemplateUpdateSchema = smsTemplateSchema.partial().omit({ template_code: true });

// 公开 — 验证码收发
router.post('/send-code', codeLimiter, validate(sendCodeSchema), asyncHandler(sendVerificationCode));
router.post('/verify-code', verifyLimiter, validate(verifyCodeSchema), asyncHandler(verifyCode));

// 登录用户 — 手动触发通知短信
router.post('/send', authMiddleware, validate(sendNotificationSchema), asyncHandler(sendNotification));

// 管理后台 — 模板管理 + 日志
router.get('/templates', authMiddleware, adminAuth, asyncHandler(listTemplates));
router.post('/templates', authMiddleware, adminAuth, validate(smsTemplateSchema), asyncHandler(createTemplate));
router.put('/templates/:id', authMiddleware, adminAuth, validate(idParamSchema, 'params'), validate(smsTemplateUpdateSchema), asyncHandler(updateTemplate));
router.delete('/templates/:id', authMiddleware, adminAuth, validate(idParamSchema, 'params'), asyncHandler(deleteTemplate));
router.get('/logs', authMiddleware, adminAuth, asyncHandler(listLogs));

export default router;
