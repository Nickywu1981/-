/**
 * Movio AI v4.1 — Image Routes
 * G5 后端开发 | W2
 */
import { Router } from 'express';
import { z } from 'zod';
import { validateV4 as _validate, validate, paginationSchema } from '../utils/validate.js';
import { contentModerationMiddleware } from '../middleware/content-moderation.middleware.js';
import { tierGuard } from '../middleware/tierGuard.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import * as ctrl from '../controller/v4ImageController.js';

const router = Router();

const worksQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
});

const generateSchema = z.object({
  prompt: z.string().min(1, '请提供提示词').max(4000),
  ratio: z.string().optional(),
  style: z.string().max(50).optional(),
});

const replicateSchema = z.object({
  reference_image_url: z.string().url('参考图URL格式不正确'),
  product_name: z.string().min(1, '请提供商品名称').max(200),
  style: z.string().max(50).optional(),
  ratio: z.string().optional(),
});

const batchGenerateSchema = z.object({
  prompts: z.array(z.string().min(1).max(4000)).min(1, '至少一条提示词').max(20, '最多20条提示词'),
  ratio: z.string().optional(),
  style: z.string().max(50).optional(),
});

const batchEditSchema = z.object({
  images: z.array(z.string().url('图片URL格式不正确')).min(1).max(50),
  operations: z.object({}).passthrough().optional(),
});

const batchReplaceSchema = z.object({
  images: z.array(z.string().url()).min(1).max(50),
  new_background: z.string().max(500).optional(),
  new_scene: z.string().max(500).optional(),
});

const enhancePromptSchema = z.object({
  prompt: z.string().min(1, '请提供提示词').max(4000),
  type: z.enum(['image', 'video', 'detail', 'poster', 'social']).default('image'),
});

router.post('/generate', heavyLimiter, _validate(generateSchema), tierGuard('image'), contentModerationMiddleware('input'), ctrl.generateImage);
router.post('/replicate', heavyLimiter, _validate(replicateSchema), tierGuard('image'), ctrl.replicateMainImage);
router.post('/batch-generate', heavyLimiter, _validate(batchGenerateSchema), tierGuard('image'), ctrl.batchGenerateImage);
router.post('/batch-edit', heavyLimiter, _validate(batchEditSchema), tierGuard('image'), ctrl.batchEditImage);
router.post('/batch-replace', heavyLimiter, _validate(batchReplaceSchema), tierGuard('image'), ctrl.batchReplaceImage);
router.get('/works', validate(worksQuerySchema, 'query'), ctrl.getImageWorks);
router.post('/enhance-prompt', heavyLimiter, _validate(enhancePromptSchema), ctrl.enhancePrompt);

export default router;
