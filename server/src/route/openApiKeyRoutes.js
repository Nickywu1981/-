/**
 * Open API Key 路由 — 开发者密钥管理
 * G5 后端 | 阶段4
 */
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { adminAuth } from '../middleware/auth.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import { validate, idParamSchema } from '../utils/validate.js';
import { z } from 'zod';
import * as ctl from '../controller/openApiKeyController.js';

const router = Router();
router.use(authMiddleware);

const createSchema = z.object({
  description: z.string().max(200).optional(),
  rateLimit: z.number().int().min(1).max(1000).optional(),
  dailyLimit: z.number().int().min(1).max(100000).optional(),
});
const toggleSchema = z.object({ status: z.number().int().min(0).max(1) });
const updateSchema = z.object({
  description: z.string().max(200).optional(),
  rateLimit: z.number().int().min(1).max(1000).optional(),
  dailyLimit: z.number().int().min(1).max(100000).optional(),
});

router.get('/keys', adminAuth, ctl.listKeys);
router.post('/keys', heavyLimiter, adminAuth, validate(createSchema), ctl.createKey);
router.put('/keys/:id/toggle', heavyLimiter, adminAuth, validate(idParamSchema, 'params'), validate(toggleSchema), ctl.toggleKey);
router.put('/keys/:id', heavyLimiter, adminAuth, validate(idParamSchema, 'params'), validate(updateSchema), ctl.updateKey);
router.delete('/keys/:id', heavyLimiter, adminAuth, validate(idParamSchema, 'params'), ctl.deleteKey);

export default router;
