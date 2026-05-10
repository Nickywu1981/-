/**
 * FAB 卖点结构路由
 */
import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../utils/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import * as ctrl from '../controller/fabStructureController.js';

const router = Router();

const fabSchema = z.object({
  productName: z.string().min(1).max(200),
  features: z.array(z.string().min(1).max(50)).min(1).max(10),
  category: z.string().max(50).optional(),
  style: z.enum(['standard', 'social', 'concise']).optional(),
});

router.post('/generate', heavyLimiter, authMiddleware, validate(fabSchema), asyncHandler(ctrl.generateFAB));
router.get('/templates', asyncHandler(ctrl.getTemplates));

export default router;
