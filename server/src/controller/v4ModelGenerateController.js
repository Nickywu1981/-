/**
 * Movio AI v4.1 — Model Generate Controller
 */
import { wrapController } from '../utils/wrapController.js';
import { success } from '../utils/response.js';
import { infer } from '../services/aiEngine.js';

export const generate = wrapController(async (req, res) => {
  const result = await infer('model-generate', req.validated);
  return success(res, result, '模特生成成功');
});
