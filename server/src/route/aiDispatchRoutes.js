/**
 * AI 调度路由 — 多模型统一入口
 * G1 Architect | POST /api/ai/dispatch
 *
 * 支持三种模式: auto | custom | single
 * Zod 入参校验 + asyncHandler
 */

import { Router } from 'express';
import z from 'zod';
import { dispatch, getCategories, getModelsByCategory, getUsageStats, healthCheck, clearCache, extensionHooks } from '../services/modelDispatcher.js';
import { gatewayDispatch } from '../gateway/aiGatewayHub.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../utils/validate.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import { success } from '../utils/response.js';

const router = Router();

// ==================== Zod Schemas ====================

const dispatchSchema = z.object({
  mode: z.enum(['auto', 'custom', 'single']).default('auto'),
  taskType: z.string().min(1).max(64),
  input: z.record(z.unknown()),
  modelId: z.string().optional(),
  customConfig: z
    .object({
      models: z.array(z.object({
        id: z.string(),
        order: z.number().int().min(0).optional(),
      })).min(1).max(10),
      execution: z.enum(['serial', 'parallel']).default('serial'),
      fallback: z.enum(['degrade', 'fail']).default('degrade'),
    })
    .optional(),
  skipCache: z.boolean().optional(),
});

// ==================== POST /api/ai/dispatch ====================

router.post('/dispatch', authMiddleware, heavyLimiter, validate(dispatchSchema), asyncHandler(async (req, res) => {
  const { mode, taskType, input, modelId, customConfig, skipCache } = req.body;

  const result = await gatewayDispatch(
    { mode, taskType, input, modelId, customConfig },
    { skipCache, userId: req.user?.id, tenantId: req.tenantId, taskType, source: 'consumer', correlationId: req.headers['x-correlation-id'] },
  );

  return success(res, result);
}));

// ==================== GET /api/ai/categories ====================

router.get('/categories', asyncHandler(async (_req, res) => {
  const categories = getCategories();
  return success(res, categories);
}));

const categoryParamSchema = z.object({ category: z.string().min(1).max(50) });

// ==================== GET /api/ai/categories/:category ====================

router.get('/categories/:category', validate(categoryParamSchema, 'params'), asyncHandler(async (req, res) => {
  const models = getModelsByCategory(req.params.category);
  return success(res, { category: req.params.category, models: models.map((m) => m.id) });
}));

// ==================== GET /api/ai/health ====================

router.get('/health', asyncHandler(async (_req, res) => {
  const health = await healthCheck();
  const stats = getUsageStats();
  const extensions = Object.keys(extensionHooks).reduce((acc, k) => {
    acc[k] = extensionHooks[k] ? 'registered' : 'available';
    return acc;
  }, {});
  return success(res, { health, stats, extensions });
}));

// ==================== GET /api/ai/stats ====================

router.get('/stats', authMiddleware, asyncHandler(async (_req, res) => {
  const stats = getUsageStats();
  return success(res, stats);
}));

// ==================== POST /api/ai/cache/clear ====================

router.post('/cache/clear', authMiddleware, validate(z.object({})), asyncHandler(async (_req, res) => {
  clearCache();
  return success(res, {}, 'AI 推理缓存已清除');
}));

export default router;
