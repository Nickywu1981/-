/**
 * 脚本分镜 Agent 包装器 — pipelineOrchestrator 契约适配
 * 桥接 ADK storyboardAgent → pipelineOrchestrator 期望的 generateScriptAndStoryboard() + analyzeViralAndClone()
 */
import { scriptStoryboardAgent } from '../adk/agents/storyboardAgent.js';
import { Session } from '../adk/core/session.js';
import { InvocationContext } from '../adk/core/invocationContext.js';
import logger from '../utils/logger.js';

export async function generateScriptAndStoryboard(params = {}) {
  const session = new Session({ userId: params.ctx?.userId });
  session.state.set('productName', params.productName || '');
  session.state.set('platform', params.platform || 'douyin');
  session.state.set('contentType', params.contentType || 'ad');
  session.state.set('shotCount', params.shotCount || 6);
  session.state.set('videoDuration', params.duration || 30);
  session.state.set('sellingPoints', params.sellingPoints || []);
  session.state.set('hookStyle', params.hookStyle || 'question');
  session.state.set('userInput', params.productName || '');

  const ctx = new InvocationContext({ session, agentName: 'script_storyboard' });
  const result = await scriptStoryboardAgent.runAsync(ctx);

  logger.info('[scriptStoryboardAgent] generateScriptAndStoryboard complete', {
    hasScript: !!result?.script,
    hasStoryboard: !!result?.storyboard,
  });

  return {
    script: result?.script || { text: '' },
    storyboard: result?.storyboard || [],
  };
}

export async function analyzeViralAndClone(videoUrl, productName = '商品', ctxParam) {
  const session = new Session({ userId: ctxParam?.userId });
  session.state.set('referenceVideoUrl', videoUrl);
  session.state.set('productName', productName);
  session.state.set('userInput', videoUrl);

  const ctx = new InvocationContext({ session, agentName: 'script_storyboard' });
  const result = await scriptStoryboardAgent.runAsync(ctx);

  logger.info('[scriptStoryboardAgent] analyzeViralAndClone complete', {
    hasAnalysis: !!result?.viralAnalysis,
  });

  return {
    viralAnalysis: result?.viralAnalysis || null,
    script: result?.script || { text: '' },
    storyboard: result?.storyboard || [],
  };
}
