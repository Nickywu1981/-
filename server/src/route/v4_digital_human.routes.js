import { Router } from 'express';
import { z } from 'zod';
import { validateV4 as _validate } from '../utils/validate.js';
import { contentModerationMiddleware } from '../middleware/content-moderation.middleware.js';
import { authMiddleware } from '../middleware/auth.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import { tierGuard } from '../middleware/tierGuard.js';
import * as digitalHumanController from '../controller/digitalHumanController.js';

const router = Router();

const createSchema = z.object({
  text: z.string().optional(),
  audioUrl: z.string().url().optional(),
  avatarStyle: z.enum(['realistic', 'cartoon', 'business']).default('realistic'),
  background: z.enum(['studio', 'white', 'custom']).default('studio'),
}).refine(d => d.text || d.audioUrl, { message: '请提供口播文本或音频' });

// POST /api/digital-human/create
router.post('/create', heavyLimiter, tierGuard('video'), _validate(createSchema), contentModerationMiddleware, digitalHumanController.create);

// GET /api/digital-human/history
router.get('/history', digitalHumanController.getHistory);

export default router;
