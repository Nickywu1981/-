/**
 * voice routes — AI 语音生成 + 声音克隆
 * POST /api/voice/generate | /api/voice/clone
 */
import { Router } from 'express';
import { z } from 'zod';
import { validateV4 as _validate } from '../utils/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import * as ctrl from '../controller/v4VoiceController.js';

const router = Router();

const generateSchema = z.object({
  text: z.string().min(1, '请输入文本').max(5000),
  voice: z.string().max(50).optional(),
  speed: z.number().min(0.5).max(2).optional(),
});

const cloneSchema = z.object({
  sampleUrl: z.string().url('请提供有效的音频URL'),
  text: z.string().min(1, '请输入要合成文本').max(5000),
  name: z.string().max(30).optional(),
});

router.post('/generate', authMiddleware, heavyLimiter, _validate(generateSchema), ctrl.generateVoice);

router.post('/clone', authMiddleware, heavyLimiter, _validate(cloneSchema), ctrl.cloneVoice);

export default router;
