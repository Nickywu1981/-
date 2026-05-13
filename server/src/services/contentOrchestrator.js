/**
 * 内容生成编排 Agent 包装器 — pipelineOrchestrator 契约适配
 * 桥接 ADK dispatchAgent + contentAgent → pipelineOrchestrator 期望的 composeVideo() + generateContent()
 */
import { contentDispatchAgent } from '../adk/agents/dispatchAgent.js';
import { ContentAgent } from '../adk/agents/contentAgent.js';
import { Session } from '../adk/core/session.js';
import { InvocationContext } from '../adk/core/invocationContext.js';
import logger from '../utils/logger.js';

export async function composeVideo(params = {}) {
  const session = new Session({ userId: params.ctx?.userId });
  session.state.set('taskType', 'video_gen');
  session.state.set('needsVideo', true);
  session.state.set('needsVoice', !!params.audio);
  session.state.set('storyboardFrames', params.storyboard || []);
  session.state.set('script', params.script || {});
  session.state.set('audio', params.audio || {});
  session.state.set('userInput', params.script?.text || '');

  const ctx = new InvocationContext({ session, agentName: 'content_dispatch' });
  const result = await contentDispatchAgent.runAsync(ctx);

  logger.info('[contentOrchestrator] composeVideo complete', {
    hasVideo: !!result?.video,
    hasVoice: !!result?.voice,
  });

  return {
    videoUrl: result?.video?.url || '',
    audioUrl: result?.voice?.url || '',
    status: result?.video ? 'done' : 'pending',
  };
}

export async function generateContent(text, options = {}) {
  const session = new Session({ userId: options.ctx?.userId });
  session.state.set('userInput', text);
  session.state.set('taskType', options.taskType || 'text_gen');
  session.state.set('platform', options.platform || 'general');

  const ctx = new InvocationContext({ session, agentName: 'content_agent' });
  const result = await ContentAgent.runAsync(ctx);

  logger.info('[contentOrchestrator] generateContent complete');

  return {
    content: result?.content || result?.output || '',
    format: options.format || 'text',
  };
}
