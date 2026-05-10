/**
 * product-render routes — 产品 3D 渲染
 * POST /api/render/product
 */
import { Router } from 'express';
import { z } from 'zod';
import { success } from '../utils/response.js';
import { validateV4 as _validate } from '../utils/validate.js';
import { infer } from '../services/aiEngine.js';

const router = Router();

const renderSchema = z.object({
  modelUrl: z.string().min(1, '请上传产品 3D 模型'),
  angle: z.enum(['front', 'back', 'side', 'top', '360']).optional(),
  resolution: z.enum(['1K', '2K', '4K']).optional(),
  background: z.string().max(50).optional(),
  format: z.enum(['png', 'jpg', 'webp']).optional(),
});

router.post('/product', _validate(renderSchema), async (req, res, next) => {
  try {
    const result = await infer('product-render', req.validated);
    return success(res, result, '渲染成功');
  } catch (e) { next(e); }
});

export default router;
