/**
 * Movio AI v4.1 — Detail Image Routes
 * G5 后端开发 | W2
 * POST /api/detail/generate-set | /replicate
 * GET  /api/detail/works
 */
import { Router } from 'express';
import { z } from 'zod';
import { validateV4 as _validate, validate, paginationSchema } from '../utils/validate.js';
import { contentModerationMiddleware } from '../middleware/content-moderation.middleware.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import { authMiddleware } from '../middleware/auth.js';
import * as ctrl from '../controller/v4DetailController.js';

const router = Router();
router.use(authMiddleware);

const generateSetSchema = z.object({
  product_name: z.string().min(1, '请提供商品名称').max(200),
  product_images: z.array(z.string().url('图片URL格式不正确')).min(1, '至少1张商品图').max(10, '最多10张'),
  highlights: z.array(z.string().max(100)).max(10).optional().default([]),
  template: z.string().max(50).optional().default('standard'),
});

const replicateSchema = z.object({
  reference_url: z.string().url('参考图URL格式不正确'),
  product_name: z.string().min(1, '请提供商品名称').max(200),
  product_images: z.array(z.string().url()).min(1).max(10).optional().default([]),
  template: z.string().max(50).optional().default('standard'),
});

// POST /api/detail/generate-set
router.post('/generate-set', heavyLimiter, _validate(generateSetSchema), contentModerationMiddleware('input'), ctrl.generateDetailSet);

// POST /api/detail/replicate
router.post('/replicate', heavyLimiter, _validate(replicateSchema), ctrl.replicateDetail);

// GET /api/detail/works
router.get('/works', validate(paginationSchema, 'query'), ctrl.getDetailWorks);

export default router;
