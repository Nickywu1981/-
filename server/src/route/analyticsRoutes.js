import { Router } from 'express';
import { track, funnel, active, topTools, trend, conversionFunnel } from '../controller/analyticsController.js';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../utils/validate.js';
import { z } from 'zod';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = Router();

const trackSchema = z.object({
  event: z.string().min(1).max(100),
  metadata: z.record(z.unknown()).optional(),
});

// 埋点上报（需登录）
router.post('/track', authMiddleware, apiLimiter, validate(trackSchema), asyncHandler(track));

// 数据查询（仅管理员）
router.get('/funnel', authMiddleware, adminAuth, asyncHandler(funnel));
router.get('/active', authMiddleware, adminAuth, asyncHandler(active));
router.get('/top-tools', authMiddleware, adminAuth, asyncHandler(topTools));
router.get('/trend', authMiddleware, adminAuth, asyncHandler(trend));
router.get('/conversion', authMiddleware, adminAuth, asyncHandler(conversionFunnel));

export default router;
