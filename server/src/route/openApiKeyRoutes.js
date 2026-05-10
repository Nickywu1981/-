/**
 * Open API Key 路由 — 开发者密钥管理
 * G5 后端 | 阶段4
 */
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { adminAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../utils/validate.js';
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
const idParamSchema = z.object({ id: z.string().regex(/^\d+$/).transform(Number) });

router.get('/keys', adminAuth, asyncHandler(ctl.listKeys));
router.post('/keys', adminAuth, validate(createSchema), asyncHandler(ctl.createKey));
router.put('/keys/:id/toggle', adminAuth, validate(idParamSchema, 'params'), validate(toggleSchema), asyncHandler(ctl.toggleKey));
router.put('/keys/:id', adminAuth, validate(idParamSchema, 'params'), validate(updateSchema), asyncHandler(ctl.updateKey));
router.delete('/keys/:id', adminAuth, validate(idParamSchema, 'params'), asyncHandler(ctl.deleteKey));

export default router;
