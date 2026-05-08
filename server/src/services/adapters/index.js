/**
 * AI Adapter 自动注册
 * 在服务启动时调用 registerAll()，根据 .env 配置自动加载可用模型
 *
 * 使用方式（server/src/index.js）:
 *   import { registerAllAdapters } from './services/adapters/index.js';
 *   await registerAllAdapters();
 */

import { registerOpenAI } from './openaiAdapter.js';
import { registerClaude } from './claudeAdapter.js';
import { registerSD } from './sdAdapter.js';
import logger from '../../utils/logger.js';

export async function registerAllAdapters() {
  logger.info('[AI] ========== 注册 AI 模型适配器 ==========');

  // 并行注册全部适配器（无 API-Key 时静默跳过核心逻辑，仅 health 返回 unavailable）
  const results = await Promise.allSettled([
    registerOpenAI(),
    registerClaude(),
    registerSD(),
  ]);

  results.forEach((r, i) => {
    const name = ['OpenAI', 'Claude', 'SD'][i];
    if (r.status === 'rejected') logger.error(`[AI] ${name} 注册失败: ${r.reason.message}`);
  });

  const { listModels } = await import('../aiEngine.js');
  const models = listModels();

  // 启动健康报告：检测哪些模型真正可用（API-Key 已配置）
  const healthResults = await Promise.allSettled(
    models.map((m) => m.health?.().then((h) => ({ id: m.id, ...h })) ?? Promise.resolve({ id: m.id, status: 'no-health-check' })),
  );
  const online = healthResults.filter((r) => r.status === 'fulfilled' && r.value?.status === 'ok');
  const offline = healthResults.filter((r) => r.status === 'rejected' || r.value?.status !== 'ok');

  logger.info(`[AI] 共注册 ${models.length} 个模型`);
  if (online.length) logger.info(`[AI]   ✅ 可用 (${online.length}): ${online.map((r) => r.value?.id).join(', ')}`);
  if (offline.length) logger.info(`[AI]   ⚠️  不可用 (${offline.length}): ${offline.map((r) => r.value?.id || r.reason?.message).join(', ')}`);
  logger.info('[AI] =========================================');
}

export { registerOpenAI, registerClaude, registerSD };
