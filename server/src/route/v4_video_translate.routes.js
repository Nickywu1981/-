/**
 * Movio AI v4.1 — Video Translate Routes
 * G5 后端开发 | Phase 2
 */
import { Router } from 'express';
import { z } from 'zod';
import { validateV4 as _validate } from '../utils/validate.js';
import { contentModerationMiddleware } from '../middleware/content-moderation.middleware.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import { tierGuard } from '../middleware/tierGuard.js';
import { authMiddleware } from '../middleware/auth.js';
import * as ctrl from '../controller/v4VideoTranslateController.js';

const router = Router();
router.use(authMiddleware);

const baseTranslateSchema = z.object({
  videoUrl: z.string().url('请提供有效视频链接'),
  sourceLang: z.string().default('zh'),
  targetLang: z.string().min(1, '请选择目标语言').max(10),
});

const worksQuerySchema = z.object({
  type: z.string().max(50).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

router.post('/voice',
  heavyLimiter, tierGuard('video'), _validate(baseTranslateSchema.extend({
    voiceType: z.string().default('natural'),
  })),
  contentModerationMiddleware,
  ctrl.translateVoice,
);

router.post('/subtitles',
  heavyLimiter, tierGuard('video'), _validate(baseTranslateSchema.extend({
    subtitleStyle: z.string().default('default'),
  })),
  ctrl.translateSubtitles,
);

router.post('/face',
  heavyLimiter, tierGuard('video'), _validate(baseTranslateSchema.extend({
    avatarStyle: z.string().default('original'),
  })),
  contentModerationMiddleware,
  ctrl.translateFace,
);

router.get('/langs', ctrl.getSupportedLangs);
router.get('/works', _validate(worksQuerySchema, 'query'), ctrl.getUserTranslateHistory);

export default router;
