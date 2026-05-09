/**
 * voice routes — AI 语音生成 + 声音克隆
 * POST /api/voice/generate | /api/voice/clone
 */
import { Router } from 'express';
import { z } from 'zod';
import { success } from '../utils/response.js';
import { aiEngine } from '../services/aiEngine.js';

const router = Router();

const generateSchema = z.object({
  text: z.string().min(1, '请输入文本').max(5000),
  voice: z.string().max(50).optional(),
  speed: z.number().min(0.5).max(2).optional(),
});

const cloneSchema = z.object({
  sampleUrl: z.string().min(1, '请上传声音样本'),
  text: z.string().min(1, '请输入要合成文本').max(5000),
  name: z.string().max(30).optional(),
});

router.post('/generate', async (req, res, next) => {
  try {
    const input = generateSchema.parse(req.body);
    const result = await aiEngine.infer({ type: 'tts-generate', ...input });
    return success(res, result, '语音生成成功');
  } catch (e) { next(e); }
});

router.post('/clone', async (req, res, next) => {
  try {
    const input = cloneSchema.parse(req.body);
    const result = await aiEngine.infer({ type: 'tts-clone', ...input });
    return success(res, result, '声音克隆成功');
  } catch (e) { next(e); }
});

export default router;
