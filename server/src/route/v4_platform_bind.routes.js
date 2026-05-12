/**
 * Movio AI v4.1 — Platform Binding Routes
 * G5 后端开发 | W4
 * GET    /api/platforms/bindings  — 用户已绑定平台列表
 * POST   /api/platforms/bind      — 绑定新平台
 * DELETE /api/platforms/bind/:id  — 解绑
 */
import { Router } from 'express';
import { z } from 'zod';
import { validateV4 as _validate, validate, idParamSchema } from '../utils/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import * as ctrl from '../controller/v4PlatformBindController.js';

const router = Router();

router.use(authMiddleware);

const bindSchema = z.object({
  platform: z.string().min(1, '请提供平台标识').max(50),
  bind_type: z.enum(['shop', 'creator']).default('shop'),
  account_id: z.string().min(1, '请提供账号ID').max(100),
  account_name: z.string().max(100).optional(),
});

const publishSchema = z.object({
  work_id: z.string().min(1, '请提供作品ID').max(50),
  platform: z.string().min(1, '请提供目标平台').max(50),
  content_url: z.string().url().optional(),
});

// GET /api/platforms/bindings
router.get('/bindings', ctrl.getBindings);

// POST /api/platforms/bind
router.post('/bind', heavyLimiter, _validate(bindSchema), ctrl.bind);

// DELETE /api/platforms/bind/:id
router.delete('/bind/:id', heavyLimiter, validate(idParamSchema, 'params'), ctrl.unbind);

// POST /api/platforms/publish — 发布内容到平台
router.post('/publish', heavyLimiter, _validate(publishSchema), ctrl.publish);

export default router;
