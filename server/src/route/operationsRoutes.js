/**
 * 跨租户运营看板路由 — 第四层架构：总后台+运营端
 *
 * GET /api/ops/overview         — 跨租户总览
 * GET /api/ops/tokens           — Token 聚合统计
 * GET /api/ops/profits          — 利润总览
 * GET /api/ops/trends           — 运营趋势
 * GET /api/ops/tenants/ranking  — 租户排行
 */
import { Router } from 'express';
import {
  getOpsOverview,
  getTokenAggregation,
  getProfitOverview,
  getOpsTrends,
  getTenantRanking,
} from '../services/operationsService.js';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { adminLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../utils/validate.js';
import { success } from '../utils/response.js';
import { z } from 'zod';

const router = Router();

// ========== Zod Schemas ==========

const daysQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

const rankingQuerySchema = z.object({
  metric: z.enum(['tokens', 'cost', 'tasks']).default('tokens'),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

// ========== 所有运营路由需要管理员认证 + 限流 ==========

router.use(authMiddleware);

// GET /api/ops/overview
router.get('/overview', adminAuth, adminLimiter, asyncHandler(async (req, res) => {
  const data = await getOpsOverview();
  return success(res, data);
}));

// GET /api/ops/tokens?days=30
router.get('/tokens', adminAuth, adminLimiter, validate(daysQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const data = await getTokenAggregation({ days: req.query.days });
  return success(res, data);
}));

// GET /api/ops/profits
router.get('/profits', adminAuth, adminLimiter, asyncHandler(async (req, res) => {
  const data = await getProfitOverview();
  return success(res, data);
}));

// GET /api/ops/trends?days=30
router.get('/trends', adminAuth, adminLimiter, validate(daysQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const data = await getOpsTrends({ days: req.query.days });
  return success(res, data);
}));

// GET /api/ops/tenants/ranking?metric=tokens&limit=10
router.get('/tenants/ranking', adminAuth, adminLimiter, validate(rankingQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const data = await getTenantRanking({ metric: req.query.metric, limit: req.query.limit });
  return success(res, data);
}));

export default router;
