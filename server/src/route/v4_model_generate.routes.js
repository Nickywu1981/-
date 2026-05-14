/**
 * model-generate routes — AI 模特生成
 * POST /api/model/generate
 */
import { Router } from 'express';
import { z } from 'zod';
import { validateV4 as _validate } from '../utils/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import * as ctrl from '../controller/v4ModelGenerateController.js';

const router = Router();

const generateSchema = z.object({
  clothingImage: z.string().min(1, '请上传服装图片').max(2000),
  gender: z.enum(['male', 'female', 'neutral']).optional(),
  skinTone: z.string().max(30).optional(),
  pose: z.string().max(50).optional(),
  count: z.number().int().min(1).max(4).optional(),
});

router.post('/generate', authMiddleware, heavyLimiter, _validate(generateSchema), ctrl.generate);

export default router;
