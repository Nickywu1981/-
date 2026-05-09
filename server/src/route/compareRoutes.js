import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { success, error } from '../utils/response.js';

const router = Router();

// 并排对比: 接受两张图片URL，返回对齐后的对比数据
router.post('/side-by-side', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const { imageA, imageB, mode = 'side-by-side' } = req.body;
    if (!imageA || !imageB) return error(res, 400, '需要两张图片URL');
    success(res, {
      mode,
      imageA: { url: imageA, label: req.body.labelA || '原始图' },
      imageB: { url: imageB, label: req.body.labelB || '生成图' },
      modes: ['side-by-side', 'slider', 'overlay'],
    });
  } catch (e) { error(res, 500, e.message); }
}));

export default router;
