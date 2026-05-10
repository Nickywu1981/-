/**
 * model-generate routes — AI 模特生成
 * POST /api/model/generate
 */
import { Router } from 'express';
import { z } from 'zod';
import { success, error } from '../utils/response.js';
import { validateV4 as _validate } from '../utils/validate.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { authMiddleware } from '../middleware/auth.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import { infer } from '../services/aiEngine.js';

const router = Router();
router.use(authMiddleware);

const generateSchema = z.object({
  clothingImage: z.string().min(1, '请上传服装图片'),
  gender: z.enum(['male', 'female', 'neutral']).optional(),
  skinTone: z.string().max(30).optional(),
  pose: z.string().max(50).optional(),
  count: z.number().int().min(1).max(4).optional(),
});

router.post('/generate', heavyLimiter, _validate(generateSchema), async (req, res) => {
  try {
    const result = await infer('model-generate', req.validated);
    return success(res, result, '模特生成成功');
  } catch (e) {
    return error(res, e.status || ERROR_CODE.INTERNAL_ERROR, e.message || '模特生成失败');
  }
});

export default router;
