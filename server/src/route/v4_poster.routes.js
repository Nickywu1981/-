/**
 * Movio AI v4.1 — Poster Routes
 * G5 后端开发 | Phase 2
 * POST /api/posters/generate | /enhance-prompt
 * GET  /api/posters/sizes | /api/posters/works
 */
import { Router } from 'express';
import { z } from 'zod';
import { validateV4 as _validate } from '../utils/validate.js';
import { contentModerationMiddleware } from '../middleware/content-moderation.middleware.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import { authMiddleware } from '../middleware/auth.js';
import * as ctrl from '../controller/v4PosterController.js';

const router = Router();
router.use(authMiddleware);

// ─── POST /api/posters/generate ───────────────────────────────
const generateSchema = z.object({
  posterType: z.enum(['product', 'holiday', 'event', 'private', 'xhs', 'wechat']),
  prompt: z.string().min(1, '请提供海报描述').max(4000),
  enhancedPrompt: z.string().max(4000).optional(),
  style: z.string().max(2000).optional(),
});

router.post('/generate',
  heavyLimiter, _validate(generateSchema),
  contentModerationMiddleware('input'),
  ctrl.generatePoster,
);

// ─── POST /api/posters/enhance-prompt ─────────────────────────
const enhanceSchema = z.object({
  prompt: z.string().min(1).max(4000),
  posterType: z.enum(['product', 'holiday', 'event', 'private', 'xhs', 'wechat']),
});

router.post('/enhance-prompt', heavyLimiter, _validate(enhanceSchema), ctrl.enhancePrompt);

// ─── GET /api/posters/sizes ────────────────────────────────────
router.get('/sizes', ctrl.getSizes);

// ─── GET /api/posters/works ────────────────────────────────────
const worksQuerySchema = z.object({
  type: z.string().max(50).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

router.get('/works', _validate(worksQuerySchema, 'query'), ctrl.getUserPosters);

export default router;
