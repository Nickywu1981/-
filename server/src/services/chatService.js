/**
 * Chat Service — 对话模块核心编排
 *
 * 完整管线：
 *  用户输入 → 合规前置拦截 → 意图识别 → 提示词解析(合规硬约束注入) →
 *  路由分发(图片/视频/文案/跨境已有机型) → SSE 流式输出(边输出边审核)
 *
 * 复用现有模块：
 *  - classifyIntent (intentClassifier.js)
 *  - checkCompliance (adComplianceEngine.js)
 *  - wrapPrompt (promptWrapper.js)
 *  - createSSEStream / processStreamingOutput (streamingService.js)
 *  - SessionStore (adk/core/sessionStore.js)
 *  - gatewayRoute (gatewayCore.js)
 */
import { classifyIntent } from './intentClassifier.js';
import { checkCompliance } from './adComplianceEngine.js';
import { wrapPrompt } from './promptWrapper.js';
import { injectReversePrompt } from './promptParser.js';
import { createSSEStream, processStreamingOutput } from './streamingService.js';
import { gatewayRoute } from '../gateway/aiGatewayHub.js';
import { SessionStore } from '../adk/core/sessionStore.js';
import logger from '../utils/logger.js';

// 意图 → 后端路由映射 (复用现有 v4 接口)
const INTENT_ROUTE_MAP = {
  main_image:     { taskType: 'image_gen',  endpoint: '/api/images/generate' },
  scene_image:    { taskType: 'image_gen',  endpoint: '/api/images/generate' },
  poster:         { taskType: 'image_gen',  endpoint: '/api/posters/generate' },
  detail_image:   { taskType: 'image_gen',  endpoint: '/api/detail/generate' },
  product_detail: { taskType: 'text_gen',   endpoint: '/api/detail/generate' },
  infographic:    { taskType: 'text_gen',   endpoint: '/api/detail/generate' },
  main_video:     { taskType: 'video_gen',  endpoint: '/api/videos/generate' },
  ad_video:       { taskType: 'video_gen',  endpoint: '/api/videos/generate' },
  action_migrate: { taskType: 'video_gen',  endpoint: '/api/videos/generate' },
  video_clone:    { taskType: 'video_gen',  endpoint: '/api/videos/generate' },
  copywriting:    { taskType: 'text_gen',   endpoint: '/api/copywriting/generate' },
  script:         { taskType: 'text_gen',   endpoint: '/api/copywriting/script' },
  selling_points: { taskType: 'text_gen',   endpoint: '/api/copywriting/generate' },
  voice:          { taskType: 'voice_gen',  endpoint: '/api/voice/generate' },
  // 新增意图 — 通用问答不路由到生成接口
  chat:           { taskType: 'chat',       endpoint: null },
  translate:      { taskType: 'text_gen',   endpoint: '/api/copywriting/generate' },
  compliance:     { taskType: 'text_gen',   endpoint: null },
};

/**
 * 处理对话消息 — 管理完整 SSE 生命周期
 */
export async function handleMessage({ res, req, message, sessionId, mode, attachments, context, userId }) {
  const sse = createSSEStream(res, req);

  // 恢复或创建 session
  const sid = sessionId || `chat_${userId}_${Date.now()}`;
  let session = sessionId ? await SessionStore.get(sessionId) : null;
  if (!session) {
    session = { id: sid, userId, messages: [], createdAt: new Date().toISOString() };
  }

  try {
    // ── Step 1: 合规前置拦截 ──
    sse.send({ type: 'status', status: 'checking', message: '正在检查内容合规...' });

    const complianceResult = checkCompliance(message, { platform: '通用', strict: true });
    if (!complianceResult.passed) {
      const blockers = complianceResult.violations.filter(v => v.level === 'block');
      if (blockers.length > 0) {
        sse.send({
          type: 'blocked',
          reason: blockers.map(v => `"${v.matched}" 违反${v.category}规定`).join('；'),
          suggestions: blockers.map(v => v.suggestion).filter(Boolean),
          sanitized: complianceResult.sanitizedText,
        });
        sse.done();
        return;
      }
    }

    // ── Step 2: 意图识别 ──
    sse.send({ type: 'status', status: 'analyzing', message: '正在分析您的需求...' });

    const intent = await classifyIntent(message, { userId, platform: context?.platform });
    const route = INTENT_ROUTE_MAP[intent.intentId] || { taskType: 'chat', endpoint: null };

    logger.info('[Chat] intent routed', { intentId: intent.intentId, category: intent.category, mode });

    // ── Step 2b: 图片分析意图 (attachments 含图片时) ──
    if (attachments?.some(a => a.type === 'image') && ['chat', 'copywriting'].includes(intent.intentId)) {
      sse.send({ type: 'status', status: 'analyzing_image', message: '正在解析图片内容...' });
    }

    // ── Step 3: 提示词解析 + 合规硬约束注入 ──
    sse.send({ type: 'status', status: 'preparing', message: '正在生成创作提示词...' });

    let wrappedPrompt;
    if (route.endpoint) {
      // 有目标生成接口 → 完整管线
      const wrapResult = await wrapPrompt(
        complianceResult.sanitizedText || message,
        {
          userId,
          platform: context?.platform || '通用',
          industry: context?.industry || null,
          variables: context?.variables || {},
        }
      );

      if (wrapResult.blocked) {
        sse.send({ type: 'blocked', reason: wrapResult.blockReason });
        sse.done();
        return;
      }

      // 合规硬约束注入：强制追加反向提示词
      const hardenedPrompt = injectReversePrompt({
        prompt: wrapResult.wrapped?.prompt || message,
        intentId: intent.intentId,
        category: intent.category,
      });

      wrappedPrompt = {
        ...wrapResult,
        wrapped: {
          ...wrapResult.wrapped,
          prompt: hardenedPrompt.positive,
          negativePrompt: hardenedPrompt.negative,
        },
        intent,
        route,
      };
    } else {
      // 通用对话 / 合规检查 → 直接 LLM，不路由到生成接口
      wrappedPrompt = {
        blocked: false,
        intent,
        wrapped: {
          system: '你是 Movio AI 电商创作助手，专注于电商内容创作、图片处理、视频制作、文案撰写。',
          prompt: complianceResult.sanitizedText || message,
          intentId: intent.intentId,
          category: intent.category,
        },
        route: { taskType: 'chat', endpoint: null },
      };
    }

    // 返回正向/反向提示词给前端展示
    sse.send({
      type: 'prompts',
      positive: wrappedPrompt.wrapped?.prompt || message,
      negative: wrappedPrompt.wrapped?.negativePrompt || '',
      intent: { id: intent.intentId, category: intent.category, label: intent.label, confidence: intent.confidence },
    });

    // ── Step 4: 路由分发 + SSE 流式输出 ──
    if (route.endpoint) {
      sse.send({ type: 'status', status: 'generating', message: '正在调用 AI 生成...' });
    }

    const sourceStream = await gatewayRoute({
      mode: 'single',
      taskType: route.taskType,
      params: {
        model: wrappedPrompt.modelHint?.provider || 'qwen-turbo',
        messages: [
          { role: 'system', content: wrappedPrompt.wrapped?.system || '你是专业的电商内容创作专家。' },
          { role: 'user', content: wrappedPrompt.wrapped?.prompt || message },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      },
    });

    // 边输出边审核
    await processStreamingOutput(sourceStream, sse, {
      onChunk: (chunk, index) => {
        sse.send({ type: 'chunk', content: chunk, index });
      },
      moderateInterval: 5,
    });

    // ── Step 5: 保存会话历史 ──
    session.messages.push({ role: 'user', content: message, timestamp: new Date().toISOString() });
    session.messages.push({ role: 'assistant', content: '[generated]', intentId: intent.intentId, timestamp: new Date().toISOString() });
    // 只保留最近 50 条消息
    if (session.messages.length > 50) {
      session.messages = session.messages.slice(-50);
    }
    await SessionStore.set(sid, session);

    sse.done();
  } catch (err) {
    logger.error('[Chat] pipeline error', { error: err.message, sessionId: sid });
    if (!sse.isDisconnected) {
      sse.error(err.message || '对话处理失败，请重试', 500);
    }
  }
}
