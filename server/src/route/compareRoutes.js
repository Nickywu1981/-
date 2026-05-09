import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../utils/validate.js';
import { success } from '../utils/response.js';
import { z } from 'zod';

const router = Router();

const sideBySideSchema = z.object({
  imageA: z.string().url(),
  imageB: z.string().url(),
  mode: z.enum(['side-by-side', 'slider', 'overlay']).optional().default('side-by-side'),
  labelA: z.string().max(50).optional(),
  labelB: z.string().max(50).optional(),
});

// 并排对比: 接受两张图片URL，返回对齐后的对比数据
router.post('/side-by-side', authMiddleware, validate(sideBySideSchema), asyncHandler(async (req, res) => {
  const { imageA, imageB, mode, labelA, labelB } = req.body;
  success(res, {
    mode,
    imageA: { url: imageA, label: labelA || '原始图' },
    imageB: { url: imageB, label: labelB || '生成图' },
    modes: ['side-by-side', 'slider', 'overlay'],
  });
}));

export default router;
