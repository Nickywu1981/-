/**
 * AI 调度路由 — 多模型统一入口
 * G1 Architect | POST /api/ai/dispatch
 */
import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../utils/validate.js';
import { aiDispatchController } from '../controller/aiDispatchController.js';

const router = Router();

const dispatchSchema = z.object({
  mode: z.enum(['auto', 'custom', 'single']).default('auto'),
  taskType: z.string().min(1).max(64),
  input: z.record(z.unknown()),
  modelId: z.string().optional(),
  customConfig: z.object({
    models: z.array(z.object({
      id: z.string(),
      order: z.number().int().min(0).optional(),
    })).min(1).max(10),
    execution: z.enum(['serial', 'parallel']).default('serial'),
    fallback: z.enum(['degrade', 'fail']).default('degrade'),
  }).optional(),
  skipCache: z.boolean().optional(),
});

const categoryParamSchema = z.object({ category: z.string().min(1).max(50) });

router.post('/dispatch', authMiddleware, heavyLimiter, validate(dispatchSchema), aiDispatchController.dispatch);
router.get('/categories', aiDispatchController.getCategories);
router.get('/categories/:category', validate(categoryParamSchema, 'params'), aiDispatchController.getModelsByCategory);
router.get('/health', aiDispatchController.health);
router.get('/stats', authMiddleware, aiDispatchController.stats);
router.post('/cache/clear', authMiddleware, adminAuth, validate(z.object({})), aiDispatchController.clearCache);

export default router;
