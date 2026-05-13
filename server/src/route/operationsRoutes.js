/**
 * 跨租户运营看板路由 — 第四层架构：总后台+运营端
 */
import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { adminLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../utils/validate.js';
import { operationsController } from '../controller/operationsController.js';

const router = Router();

const daysQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

const rankingQuerySchema = z.object({
  metric: z.enum(['tokens', 'cost', 'tasks']).default('tokens'),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});


router.get('/overview', adminAuth, adminLimiter, operationsController.overview);
router.get('/tokens', adminAuth, adminLimiter, validate(daysQuerySchema, 'query'), operationsController.tokens);
router.get('/profits', adminAuth, adminLimiter, operationsController.profits);
router.get('/trends', adminAuth, adminLimiter, validate(daysQuerySchema, 'query'), operationsController.trends);
router.get('/tenants/ranking', adminAuth, adminLimiter, validate(rankingQuerySchema, 'query'), operationsController.tenantRanking);

export default router;
