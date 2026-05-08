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

export async function registerAllAdapters() {
  console.log('[AI] ========== 注册 AI 模型适配器 ==========');

  try { registerOpenAI(); } catch (err) { console.error('[AI] OpenAI 注册失败:', err.message); }
  try { registerClaude(); } catch (err) { console.error('[AI] Claude 注册失败:', err.message); }
  try { registerSD(); } catch (err) { console.error('[AI] SD 注册失败:', err.message); }

  const { listModels } = await import('../aiEngine.js');
  const models = listModels();
  console.log(`[AI] 共注册 ${models.length} 个模型: ${models.map((m) => m.id).join(', ')}`);
  console.log('[AI] =========================================');
}

export { registerOpenAI, registerClaude, registerSD };
