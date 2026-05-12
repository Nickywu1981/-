/**
 * Movio AI v4.1 — Render Controller
 */
import { wrapController } from '../utils/wrapController.js';
import { success } from '../utils/response.js';
import { infer } from '../services/aiEngine.js';

export const renderProduct = wrapController(async (req, res) => {
  const result = await infer('product-render', req.validated);
  return success(res, result, '渲染成功');
});
