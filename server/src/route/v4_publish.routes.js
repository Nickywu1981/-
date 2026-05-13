/**
 * Movio AI v4.1 — Publish Routes (多平台内容分发)
 * M06 独家王牌功能
 */
import { Router } from 'express';
import { z } from 'zod';
import { validateV4 as _validate, validate } from '../utils/validate.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import * as ctrl from '../controller/v4PublishController.js';

const router = Router();

const submitSchema = z.object({
  workId: z.number().int().positive(),
  platforms: z.array(z.string().min(1).max(50)).min(1, '请至少选择一个目标平台'),
  title: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string()).max(20).optional(),
  scheduleAt: z.string().datetime().optional(),
});

const retryParamsSchema = z.object({
  id: z.coerce.number().int().positive('ID必须为正整数'),
});

const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
  status: z.string().optional(),
  platform: z.string().optional(),
});

router.get('/platforms', ctrl.getPublishPlatforms);
router.post('/submit', heavyLimiter, _validate(submitSchema), ctrl.submitPublish);
router.get('/batch/:id', validate(retryParamsSchema, 'params'), ctrl.getPublishBatch);
router.post('/retry/:id', heavyLimiter, validate(retryParamsSchema, 'params'), ctrl.retryPublish);
router.get('/history', _validate(historyQuerySchema, 'query'), ctrl.listPublishHistory);
router.get('/stats', ctrl.getPublishStats);

export default router;
