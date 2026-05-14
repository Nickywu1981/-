/**
 * ADK REST 路由 — 8 大能力 Agent 统一入口
 * 兼容 Google ADK A2A 协议 `/run` 端点
 */
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../utils/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import * as ctrl from '../controller/adkController.js';

const router = Router();

// Zod schema for /run/:agentName
const runSchema = z.object({
  query: z.string().min(1).max(5000),
  sessionId: z.string().max(64).optional(),
  context: z.record(z.unknown()).optional(),
});

// ==================== A2A 兼容端点 ====================

router.get('/agents', authMiddleware, ctrl.getAgents);

// A2A 标准 /run 端点
router.post('/run/:agentName', authMiddleware, heavyLimiter, validate(runSchema), ctrl.runAgent);

// A2A 标准 /.well-known/agent.json
router.get('/.well-known/agent.json', ctrl.getAgentManifest);

// ==================== 快捷端点（非 A2A） ====================

// 健康检查
router.get('/health', ctrl.healthCheck);

export default router;
