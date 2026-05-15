import { Router } from 'express';
import { track, funnel, active, topTools, trend, conversionFunnel } from '../controller/analyticsController.js';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { validate } from '../utils/validate.js';
import { z } from 'zod';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = Router();

const trackSchema = z.object({
  event: z.string().min(1).max(100),
  metadata: z.record(z.unknown()).optional(),
});

const querySchema = z.object({
  days: z.string().optional().transform(s => Math.min(Math.max(parseInt(s, 10) || 30, 1), 365)),
  limit: z.string().optional().transform(s => Math.min(Math.max(parseInt(s, 10) || 10, 1), 100)),
});

// 埋点上报（需登录）
router.post('/track', authMiddleware, apiLimiter, validate(trackSchema), track);

// 数据查询（仅管理员）
router.get('/funnel', authMiddleware, adminAuth, validate(querySchema, 'query'), funnel);
router.get('/active', authMiddleware, adminAuth, active);
router.get('/top-tools', authMiddleware, adminAuth, validate(querySchema, 'query'), topTools);
router.get('/trend', authMiddleware, adminAuth, validate(querySchema, 'query'), trend);
router.get('/conversion', authMiddleware, adminAuth, validate(querySchema, 'query'), conversionFunnel);

export default router;
