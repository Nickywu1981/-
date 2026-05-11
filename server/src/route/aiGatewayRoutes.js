/**
 * AI Gateway Routes — Token 集约化中台路由
 * 所有大模型/AI 调用统一通过 /api/ai/gateway/* 入口
 */
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';
import { aiConcurrencyGuard } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { gatewayInfer, gatewayDispatch, gatewayRoute, getGatewayStats, getGatewayPricing } from '../gateway/aiGatewayHub.js';
import { z } from 'zod';
import logger from '../utils/logger.js';

const router = Router();

// ==================== 请求体 Zod 校验 ====================

const inferBodySchema = z.object({
  modelId: z.string().min(1, 'modelId 必填'),
  input: z.record(z.any()).or(z.string()).or(z.array(z.any())),
  taskType: z.string().optional(),
  source: z.enum(['consumer', 'enterprise', 'agent', 'open_api', 'internal']).optional(),
  maxRetries: z.number().int().min(0).max(5).optional(),
  skipCache: z.boolean().optional(),
}).passthrough();

const dispatchBodySchema = z.object({
  mode: z.enum(['auto', 'custom', 'single']).optional(),
  taskType: z.string().optional(),
  input: z.record(z.any()).or(z.string()),
  modelKey: z.string().optional(),
  candidates: z.array(z.string()).optional(),
  source: z.enum(['consumer', 'enterprise', 'agent', 'open_api', 'internal']).optional(),
}).passthrough();

const routeBodySchema = z.object({
  mode: z.enum(['single', 'mixed', 'custom']).optional(),
  modelKey: z.string().optional(),
  taskType: z.string().optional(),
  params: z.record(z.any()),
  source: z.enum(['consumer', 'enterprise', 'agent', 'open_api', 'internal']).optional(),
}).passthrough();

// ==================== POST /infer — 统一推理 ====================

router.post('/infer', authMiddleware, aiConcurrencyGuard, asyncHandler(async (req, res) => {
  const parsed = inferBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ code: 422, message: '参数校验失败', errors: parsed.error.flatten() });
  }

  const { modelId, input, taskType, source, maxRetries, skipCache } = parsed.data;

  logger.info(`[Gateway] POST /infer model=${modelId} taskType=${taskType || '-'} source=${source || 'consumer'}`);

  const result = await gatewayInfer(modelId, input, {
    userId: req.user?.id,
    tenantId: req.tenantId,
    taskType: taskType || 'unknown',
    source: source || 'consumer',
    correlationId: req.headers['x-correlation-id'] || null,
    maxRetries,
    skipCache,
  });

  res.json({
    code: 0,
    data: {
      modelId: result.modelId,
      output: result.output,
      elapsed: result.elapsed,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      cost: result.cost,
      correlationId: result.correlationId,
    },
  });
}));

// ==================== POST /dispatch — 统一调度 ====================

router.post('/dispatch', authMiddleware, aiConcurrencyGuard, asyncHandler(async (req, res) => {
  const parsed = dispatchBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ code: 422, message: '参数校验失败', errors: parsed.error.flatten() });
  }

  const result = await gatewayDispatch(parsed.data, {
    userId: req.user?.id,
    tenantId: req.tenantId,
    taskType: parsed.data.taskType || 'unknown',
    source: req.body.source || 'consumer',
    correlationId: req.headers['x-correlation-id'] || null,
  });

  res.json({ code: 0, data: result });
}));

// ==================== POST /route — 统一路由 ====================

router.post('/route', authMiddleware, aiConcurrencyGuard, asyncHandler(async (req, res) => {
  const parsed = routeBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ code: 422, message: '参数校验失败', errors: parsed.error.flatten() });
  }

  const result = await gatewayRoute(parsed.data, {
    userId: req.user?.id,
    tenantId: req.tenantId,
    taskType: parsed.data.taskType || 'unknown',
    source: req.body.source || 'consumer',
    correlationId: req.headers['x-correlation-id'] || null,
  });

  res.json({ code: 0, data: result });
}));

// ==================== GET /stats/tokens — Token 统计 ====================

router.get('/stats/tokens', authMiddleware, asyncHandler(async (req, res) => {
  const stats = await getGatewayStats();
  res.json({ code: 0, data: stats });
}));

// ==================== GET /pricing — 定价查询 ====================

router.get('/pricing', asyncHandler(async (req, res) => {
  const { category } = req.query;
  const pricing = await getGatewayPricing(category || null);
  res.json({ code: 0, data: pricing });
}));

export default router;
