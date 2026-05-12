import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../utils/validate.js';
import { z } from 'zod';
import * as ctrl from '../controller/compareController.js';

const router = Router();

const sideBySideSchema = z.object({
  imageA: z.string().url(),
  imageB: z.string().url(),
  mode: z.enum(['side-by-side', 'slider', 'overlay']).optional().default('side-by-side'),
  labelA: z.string().max(50).optional(),
  labelB: z.string().max(50).optional(),
});

// 并排对比: 接受两张图片URL，返回对齐后的对比数据
router.post('/side-by-side', authMiddleware, rateLimiter, validate(sideBySideSchema), (req, res) => ctrl.sideBySide(req, res));

export default router;
