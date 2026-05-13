/**
 * 素材扩图 Agent 包装器 — pipelineOrchestrator 契约适配
 * 桥接 ADK expandAgent → pipelineOrchestrator 期望的 expandImages()
 */
import { expandAgent } from '../adk/agents/expandAgent.js';
import { Session } from '../adk/core/session.js';
import { InvocationContext } from '../adk/core/invocationContext.js';
import logger from '../utils/logger.js';

export async function expandImages(imageUrl, options = {}) {
  const session = new Session({ userId: options.ctx?.userId });
  session.state.set('imageUrl', imageUrl);
  session.state.set('productName', options.productName || '');
  session.state.set('platform', options.platform || 'taobao');
  session.state.set('industry', options.industry || 'clothing');
  session.state.set('types', options.types || ['main_image']);
  session.state.set('shotCount', options.shotCount || 6);

  const ctx = new InvocationContext({ session, agentName: 'expand' });
  const result = await expandAgent.runAsync(ctx);

  logger.info('[expansionAgent] expandImages complete', {
    hasWhiteBg: !!result?.whiteBg,
    types: Object.keys(result || {}),
  });

  return { images: result };
}
