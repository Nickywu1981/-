/**
 * model-generate routes — AI 模特生成
 * POST /api/model/generate
 */
import { Router } from 'express';
import { z } from 'zod';
import { success } from '../utils/response.js';
import { validateV4 as _validate } from '../utils/validate.js';
import { infer } from '../services/aiEngine.js';

const router = Router();

const generateSchema = z.object({
  clothingImage: z.string().min(1, '请上传服装图片'),
  gender: z.enum(['male', 'female', 'neutral']).optional(),
  skinTone: z.string().max(30).optional(),
  pose: z.string().max(50).optional(),
  count: z.number().int().min(1).max(4).optional(),
});

router.post('/generate', _validate(generateSchema), async (req, res, next) => {
  try {
    const result = await infer({ modelId: 'model-generate', input: req.validated });
    return success(res, result, '模特生成成功');
  } catch (e) { next(e); }
});

export default router;
