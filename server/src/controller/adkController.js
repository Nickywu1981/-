/**
 * ADK Controller — 8 大能力 Agent 统一入口
 */
import { wrapController } from '../utils/wrapController.js';
import { success } from '../utils/response.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import {
  MemoryAgent, AttentionAgent, ContextAgent,
  LocalizeAgent, ContentAgent, GuardAgent,
  VisualAgent, HealthAgent,
} from '../adk/agents/index.js';
import { Runner } from '../adk/core/runner.js';
import { SessionStore } from '../adk/core/sessionStore.js';

const VALID_AGENTS = new Set(['memory', 'attention', 'context', 'localize', 'content', 'guard', 'visual', 'health']);

const agentMap = {
  memory: MemoryAgent, attention: AttentionAgent,
  context: ContextAgent, localize: LocalizeAgent,
  content: ContentAgent, guard: GuardAgent,
  visual: VisualAgent, health: HealthAgent,
};

const sessionStore = new SessionStore().startCleanup();

export const getAgents = wrapController(async (_req, res) => {
  return success(res, [
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

export const runAgent = wrapController(async (req, res) => {
  const { agentName } = req.params;
  const { query, sessionId, context } = req.body || {};
  const userId = req.user?.id || req.user?.userId || 'anonymous';

  if (!VALID_AGENTS.has(agentName)) throw new BusinessError(ERROR_CODE.NOT_FOUND, 'Agent not found');

  const agent = agentMap[agentName];
  const runner = new Runner({ agent, sessionService: sessionStore });
  const result = await runner.run({ userId, sessionId, query, context });
  return success(res, result);
});

export const getAgentManifest = wrapController(async (_req, res) => {
  return success(res, {
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

export const healthCheck = wrapController(async (_req, res) => {
  const runner = new Runner({ agent: HealthAgent, sessionService: sessionStore });
  const result = await runner.run({ userId: 'system', query: 'check all systems' });
  return success(res, result);
});
