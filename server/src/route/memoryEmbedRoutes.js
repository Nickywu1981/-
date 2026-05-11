/**
 * 向量记忆路由
 */
import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../utils/validate.js';
import * as ctrl from '../controller/memoryEmbedController.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';

const router = Router();

const embedSchema = z.object({
  text: z.string().min(1).max(5000),
});

const searchSchema = z.object({
  query: z.string().min(1).max(500),
  topK: z.number().int().min(1).max(20).optional(),
});

router.post('/embed', authMiddleware, heavyLimiter, validate(embedSchema), ctrl.embed);
router.post('/search', authMiddleware, heavyLimiter, validate(searchSchema), ctrl.search);
router.get('/status', ctrl.status);

export default router;
