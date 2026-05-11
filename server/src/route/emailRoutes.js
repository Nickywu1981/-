import { Router } from 'express';
import {
  sendVerificationCode, verifyCode,
  listTemplates, updateTemplate, createTemplate, deleteTemplate,
} from '../controller/emailController.js';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { codeLimiter, verifyLimiter, adminLimiter } from '../middleware/rateLimiter.js';
import { validate, emailSchema, codeSchema, idParamSchema } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const sendCodeSchema = z.object({ email: emailSchema, scene: z.enum(['register', 'login', 'reset_password', 'bind']) });
const verifyCodeSchema = z.object({ email: emailSchema, code: codeSchema });

// 公开 — 验证码收发
router.post('/send-code', codeLimiter, validate(sendCodeSchema), sendVerificationCode);
router.post('/verify-code', verifyLimiter, validate(verifyCodeSchema), verifyCode);

// 管理后台 — 模板管理
const createTemplateSchema = z.object({
  template_code: z.string().min(1, '模板代码不能为空').max(50).regex(/^[a-z][a-z0-9_]*$/, '仅允许小写字母数字下划线，以字母开头'),
  name: z.string().min(1, '模板名称不能为空').max(100),
  subject: z.string().max(200).optional(),
  content: z.string().min(1, '模板内容不能为空').max(10000),
  provider_template_id: z.string().max(100).optional(),
  provider: z.string().max(50).optional(),
  status: z.coerce.number().int().min(0).max(1).optional(),
  remark: z.string().max(500).optional(),
});
const updateTemplateSchema = createTemplateSchema.partial().omit({ template_code: true });

router.get('/templates', authMiddleware, adminAuth, listTemplates);
router.post('/templates', adminLimiter, authMiddleware, adminAuth, validate(createTemplateSchema), createTemplate);
router.put('/templates/:id', adminLimiter, authMiddleware, adminAuth, validate(idParamSchema, 'params'), validate(updateTemplateSchema), updateTemplate);
router.delete('/templates/:id', adminLimiter, authMiddleware, adminAuth, validate(idParamSchema, 'params'), deleteTemplate);

export default router;
