/**
 * SEO 关键词路由
 */
import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../utils/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import * as ctrl from '../controller/seoKeywordController.js';

const router = Router();

const embedSchema = z.object({
  productName: z.string().min(1).max(200),
  platformCode: z.string().min(1).max(30),
  category: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
  count: z.number().int().min(1).max(20).optional(),
});

const listSchema = z.object({
  platformCode: z.string().min(1).max(30).optional(),
});

router.get('/', validate(listSchema), asyncHandler(ctrl.listPlatforms));
router.get('/keywords', asyncHandler(ctrl.getKeywords));
router.post('/embed', heavyLimiter, authMiddleware, validate(embedSchema), asyncHandler(ctrl.embedKeywords));

export default router;
