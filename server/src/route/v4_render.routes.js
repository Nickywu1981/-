/**
 * product-render routes — 产品 3D 渲染
 * POST /api/render/product
 */
import { Router } from 'express';
import { z } from 'zod';
import { validateV4 as _validate } from '../utils/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import * as ctrl from '../controller/v4RenderController.js';

const router = Router();

const renderSchema = z.object({
  modelUrl: z.string().min(1, '请上传产品 3D 模型').max(2000),
  angle: z.enum(['front', 'back', 'side', 'top', '360']).optional(),
  resolution: z.enum(['1K', '2K', '4K']).optional(),
  background: z.string().max(50).optional(),
  format: z.enum(['png', 'jpg', 'webp']).optional(),
});

router.post('/product', heavyLimiter, _validate(renderSchema), ctrl.renderProduct);

export default router;
