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

// ── 监控看板 ──
router.get('/monitor/dashboard', authMiddleware, signatureGuard, aiGatewayController.dashboard);
router.get('/monitor/models', authMiddleware, signatureGuard, aiGatewayController.modelBreakdown);
router.get('/monitor/timeseries', authMiddleware, signatureGuard, aiGatewayController.timeSeries);
router.get('/monitor/top-users', authMiddleware, signatureGuard, aiGatewayController.topUsers);
router.get('/monitor/alerts', authMiddleware, signatureGuard, aiGatewayController.alertRules);

// ── 异步任务 ──
router.post('/async/submit', authMiddleware, signatureGuard, aiConcurrencyGuard, validate(inferBodySchema), aiGatewayController.asyncSubmit);
router.get('/async/status/:taskId', authMiddleware, signatureGuard, aiGatewayController.asyncStatus);

// ── SSE 流式 ──
router.post('/stream/infer', authMiddleware, signatureGuard, aiConcurrencyGuard, validate(inferBodySchema), aiGatewayController.streamInfer);

// ── 电商管线 ──
router.post('/pipeline/wrap', authMiddleware, signatureGuard, aiGatewayController.pipelineWrap);
router.post('/pipeline/compliance', authMiddleware, signatureGuard, aiGatewayController.pipelineCompliance);

// ── 全自动编排 ──
const orchestrateSchema = z.object({
  intentId: z.string().min(1).max(100),
  input: z.record(z.unknown()).optional(),
  options: z.record(z.unknown()).optional(),
});
const resumeSchema = z.object({
  pipelineId: z.string().min(1).max(100),
  stepIndex: z.coerce.number().int().min(0).optional(),
});
router.post('/pipeline/orchestrate', authMiddleware, signatureGuard, aiConcurrencyGuard, validate(orchestrateSchema), aiGatewayController.pipelineOrchestrate);
router.post('/pipeline/resume', authMiddleware, signatureGuard, validate(resumeSchema), aiGatewayController.pipelineResume);

// ── 人工微调 ──
const adjustSchema = z.object({
  pipelineId: z.string().min(1).max(100),
  stepId: z.string().min(1).max(100).optional(),
  adjustment: z.record(z.unknown()),
});
const regenerateSchema = z.object({
  pipelineId: z.string().min(1).max(100),
  stepId: z.string().min(1).max(100).optional(),
  newInput: z.record(z.unknown()).optional(),
});
const referenceSchema = z.object({
  pipelineId: z.string().min(1).max(100).optional(),
  refUrl: z.string().url().max(500),
  refType: z.enum(['image', 'video', 'sketch', 'style']).optional(),
});
router.post('/pipeline/adjust', authMiddleware, signatureGuard, validate(adjustSchema), aiGatewayController.pipelineAdjust);
router.post('/pipeline/regenerate', authMiddleware, signatureGuard, aiConcurrencyGuard, validate(regenerateSchema), aiGatewayController.pipelineRegenerate);
router.post('/pipeline/reference', authMiddleware, signatureGuard, validate(referenceSchema), aiGatewayController.pipelineUploadReference);

export default router;
