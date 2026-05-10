/**
 * ADK REST 路由 — 8 大能力 Agent 统一入口
 * 兼容 Google ADK A2A 协议 `/run` 端点
 */
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../utils/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import {
  MemoryAgent, AttentionAgent, ContextAgent,
  LocalizeAgent, ContentAgent, GuardAgent,
  VisualAgent, HealthAgent,
} from '../adk/agents/index.js';
import { Runner } from '../adk/core/runner.js';
import { SessionStore } from '../adk/core/sessionStore.js';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

const router = Router();

// Zod schema for /run/:agentName
const runSchema = z.object({
  query: z.string().min(1).max(5000),
  sessionId: z.string().max(64).optional(),
  context: z.record(z.unknown()).optional(),
});

// 持久化 session 存储（Redis + Map fallback）
const sessionStore = new SessionStore().startCleanup();

// ==================== A2A 兼容端点 ====================

router.get('/agents', (_req, res) => {
  success(res, [
    { name: 'memory', description: '记忆力 — 四层记忆 API' },
    { name: 'attention', description: '判断力 — 注意力引擎 API' },
    { name: 'context', description: '理解力 — 上下文管理 API' },
    { name: 'localize', description: '多语言 — 跨境本地化 API' },
    { name: 'content', description: '写作力 — 内容生成 API' },
    { name: 'guard', description: '风控力 — 合规检测 API' },
    { name: 'visual', description: '视觉力 — 图片视频批量生成 API' },
    { name: 'health', description: '永不离职 — 24×7 健康监控' },
  ]);
});

// A2A 标准 /run 端点
router.post('/run/:agentName', authMiddleware, validate(runSchema), async (req, res) => {
  const { agentName } = req.params;
  const { query, sessionId, context } = req.body || {};
  const userId = req.user?.id || req.user?.userId || 'anonymous';

  const agentMap = {
    memory: MemoryAgent, attention: AttentionAgent,
    context: ContextAgent, localize: LocalizeAgent,
    content: ContentAgent, guard: GuardAgent,
    visual: VisualAgent, health: HealthAgent,
  };

  const agent = agentMap[agentName];
  if (!agent) return error(res, ERROR_CODE.NOT_FOUND, `Unknown agent: ${agentName}`);

  try {
    const runner = new Runner({ agent, sessionService: sessionStore });
    const result = await runner.run({ userId, sessionId, query, context });
    success(res, result);
  } catch (err) {
    error(res, ERROR_CODE.INTERNAL_ERROR, err.message);
  }
});

// A2A 标准 /.well-known/agent.json
router.get('/.well-known/agent.json', (_req, res) => {
  res.json({
    name: 'Movio ADK',
    description: 'MemFocus AI — 百万年薪秘书 8 大能力',
    version: '1.0.0',
    capabilities: {
      streaming: true,
      stateTransitionHistory: true,
    },
    defaultInputModes: ['text'],
    defaultOutputModes: ['text'],
    skills: [
      { id: 'memory', name: '记忆力', description: '四层记忆 API' },
      { id: 'attention', name: '判断力', description: '注意力引擎 API' },
      { id: 'context', name: '理解力', description: '上下文管理 API' },
      { id: 'localize', name: '多语言', description: '跨境本地化 API' },
      { id: 'content', name: '写作力', description: '内容生成 API' },
      { id: 'guard', name: '风控力', description: '合规检测 API' },
      { id: 'visual', name: '视觉力', description: '视频批量生成 API' },
      { id: 'health', name: '永不离职', description: '24×7 API 可用' },
    ],
  });
});

// ==================== 快捷端点（非 A2A） ====================

// 健康检查
router.get('/health', async (_req, res) => {
  try {
    const runner = new Runner({ agent: HealthAgent, sessionService: sessionStore });
    const result = await runner.run({ userId: 'system', query: 'check all systems' });
    success(res, result);
  } catch (err) {
    error(res, ERROR_CODE.INTERNAL_ERROR, err.message);
  }
});

export default router;
