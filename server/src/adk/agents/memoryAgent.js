/**
 * ADK Agent #1 — 记忆力 Agent（四层记忆 API）
 * "王女士上次买了胶原蛋白果冻，问她要不要复购"
 */
import { LlmAgent } from '../core/agent.js';
import { FunctionTool } from '../core/tool.js';

/** 记忆搜索工具 */
const searchMemory = new FunctionTool('search_memory', async (params) => {
  const { default: service } = await import('../../services/memoryEmbedService.js');
  return service.search(params.query, { limit: params.limit || 10 });
}, {
  description: '搜索用户长期记忆，返回客户历史购买记录、偏好、对话片段',
  parameters: {
    query: { type: 'string', description: '搜索查询' },
    limit: { type: 'number', description: '返回条数，默认 10' },
  },
});

export const MemoryAgent = new LlmAgent({
  name: 'memory',
  description: '记忆力 — 四层记忆 API，搜索用户历史行为和偏好',
  instruction: `你是一个电商记忆助手。根据用户查询，搜索历史记忆并给出个性化回答。
例如："王女士上次买了胶原蛋白果冻，她已经用完30天了，建议问她要不要复购"
返回格式: { "matches": [...], "suggestion": "个性化建议" }`,
  model: 'deepseek-v4-pro',
  tools: [searchMemory],
  outputKey: 'memory_result',
});
