/**
 * 详情页 Agent 包装器 — pipelineOrchestrator 契约适配
 * 桥接 ADK detailAgent → pipelineOrchestrator 期望的 generateDetailPage()
 */
import { detailPageAgent } from '../adk/agents/detailAgent.js';
import { Session } from '../adk/core/session.js';
import { InvocationContext } from '../adk/core/invocationContext.js';
import logger from '../utils/logger.js';

export async function generateDetailPage(params = {}) {
  const session = new Session({ userId: params.ctx?.userId });
  session.state.set('productName', params.productName || '');
  session.state.set('category', params.category || params.industry || '');
  session.state.set('platform', params.platform || 'taobao');
  session.state.set('industry', params.industry || 'clothing');
  session.state.set('brandTone', params.brandTone || 'professional');
  session.state.set('sellingPoints', params.sellingPoints || []);
  session.state.set('specs', params.specs || {});
  session.state.set('imageUrls', params.imageUrls || []);
  session.state.set('imageUrl', params.imageUrls?.[0] || '');
  session.state.set('userId', params.ctx?.userId);

  const ctx = new InvocationContext({ session, agentName: 'detail_page' });
  const result = await detailPageAgent.runAsync(ctx);

  logger.info('[detailPageAgent] generateDetailPage complete', {
    hasModules: !!result?.modules,
    hasSellingPoints: !!result?.sellingPoints,
  });

  return result;
}
