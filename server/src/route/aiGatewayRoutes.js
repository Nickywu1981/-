/**
 * AI Gateway Routes — Token 集約化中台路由
 * 所有大模型/AI 调用统一通过 /api/ai/gateway/* 入口
 */
import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { aiConcurrencyGuard } from '../middleware/rateLimiter.js';
import { signatureMiddleware } from '../middleware/signature.middleware.js';
import { validate } from '../utils/validate.js';
import { aiGatewayController } from '../controller/aiGatewayController.js';

const router = Router();

// 可选签名校验 — 通过环境变量 SECURITY_SIGNATURE_REQUIRED=true 启用
const signatureGuard = signatureMiddleware;

const inferBodySchema = z.object({
  modelId: z.string().min(1, 'modelId 必填').max(50),
  input: z.record(z.unknown()).or(z.string()).or(z.array(z.unknown())),
  taskType: z.string().optional(),
  source: z.enum(['consumer', 'enterprise', 'agent', 'open_api', 'internal']).optional(),
  maxRetries: z.number().int().min(0).max(5).optional(),
  skipCache: z.boolean().optional(),
}).passthrough();

const dispatchBodySchema = z.object({
  mode: z.enum(['auto', 'custom', 'single']).optional(),
  taskType: z.string().optional(),
  input: z.record(z.unknown()).or(z.string()),
  modelKey: z.string().optional(),
  candidates: z.array(z.string()).optional(),
  source: z.enum(['consumer', 'enterprise', 'agent', 'open_api', 'internal']).optional(),
}).passthrough();

const routeBodySchema = z.object({
  mode: z.enum(['single', 'mixed', 'custom']).optional(),
  modelKey: z.string().optional(),
  taskType: z.string().optional(),
  params: z.record(z.unknown()),
  source: z.enum(['consumer', 'enterprise', 'agent', 'open_api', 'internal']).optional(),
}).passthrough();

router.post('/infer', authMiddleware, signatureGuard, aiConcurrencyGuard, validate(inferBodySchema), aiGatewayController.infer);
router.post('/dispatch', authMiddleware, signatureGuard, aiConcurrencyGuard, validate(dispatchBodySchema), aiGatewayController.dispatch);
router.post('/route', authMiddleware, signatureGuard, aiConcurrencyGuard, validate(routeBodySchema), aiGatewayController.route);
router.get('/stats/tokens', authMiddleware, signatureGuard, aiGatewayController.statsTokens);
router.get('/pricing', authMiddleware, signatureGuard, aiGatewayController.pricing);

export default router;
