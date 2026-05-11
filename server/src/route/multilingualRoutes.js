import { Router } from 'express';
import { getLanguages, getScriptTypes, buildPrompt } from '../controller/multilingualController.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const buildPromptSchema = z.object({
  product: z.object({
    name: z.string().min(1).max(200),
    features: z.string().max(2000).optional(),
    targetAudience: z.string().max(500).optional(),
  }).strict(),
  language: z.string().min(2).max(10),
  scriptType: z.enum(['product-desc', 'ad-copy', 'live-script', 'social-post', 'email']),
  platform: z.string().optional(),
  tone: z.enum(['professional', 'casual', 'urgent', 'luxury', 'friendly']).optional(),
});

router.use(authMiddleware);

router.get('/languages', asyncHandler(getLanguages));
router.get('/script-types', asyncHandler(getScriptTypes));
router.post('/build-prompt', heavyLimiter, validate(buildPromptSchema), asyncHandler(buildPrompt));

export default router;
