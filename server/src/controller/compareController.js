/**
 * Compare Controller — 并排对比
 */
import { wrapController } from '../utils/wrapController.js';
import { success } from '../utils/response.js';

export const sideBySide = wrapController(async (req, res) => {
  const { imageA, imageB, mode, labelA, labelB } = req.body;
  return success(res, {
    mode,
    imageA: { url: imageA, label: labelA || '原始图' },
    imageB: { url: imageB, label: labelB || '生成图' },
    modes: ['side-by-side', 'slider', 'overlay'],
  });
});
