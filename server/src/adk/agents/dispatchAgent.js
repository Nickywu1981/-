/**
 * ADK Agent #6 — 内容生成调度 Agent（调度力）
 * "提示词强制封装 + 多模型智能调度 + 视频动作迁移 + 配音字幕 + 输出后处理"
 *
 * 桥接 aiGatewayHub.js + modelDispatcher.js + outputPostProcessor.js
 */
import { BaseAgent } from '../core/agent.js';
import { FunctionTool } from '../core/tool.js';
import logger from '../../utils/logger.js';

// ==================== 工具定义 ====================

const dispatchTool = new FunctionTool('smart_dispatch', async (params) => {
  const { gatewayDispatch } = await import('../../gateway/aiGatewayHub.js');

  const dispatchReq = {
    mode: params.mode || 'auto',
    taskType: params.taskType || 'text_gen',
    params: {
      messages: [
        { role: 'system', content: params.systemPrompt || '' },
        { role: 'user', content: params.userMessage || '' },
      ],
      temperature: params.temperature || 0.7,
      maxTokens: params.maxTokens || 4096,
    },
    fallback: params.fallback !== false,
  };

  return gatewayDispatch(dispatchReq, {
    taskType: dispatchReq.taskType,
    source: 'dispatch_agent',
    skipBusinessPipeline: true,
  });
}, {
  description: '智能调度：自动选择最优模型、熔断降级、配额控制',
  parameters: {
    mode: { type: 'string', description: '调度模式: auto|single|multi' },
    taskType: { type: 'string', description: '任务类型: text_gen|image_gen|video_gen|tts' },
    systemPrompt: { type: 'string', description: '系统提示词' },
    userMessage: { type: 'string', description: '用户消息' },
    temperature: { type: 'number', description: '温度参数' },
    maxTokens: { type: 'number', description: '最大Token数' },
    fallback: { type: 'boolean', description: '是否降级' },
  },
});

const postProcessTool = new FunctionTool('post_process_output', async (params) => {
  const { postProcessOutput } = await import('../../services/outputPostProcessor.js');
  return postProcessOutput(params.output, {
    format: params.format || 'html',
    sanitize: params.sanitize !== false,
  });
}, {
  description: '输出后处理：Markdown→HTML转换 + PII二次脱敏 + 格式规整',
  parameters: {
    output: { type: 'string', description: '模型原始输出' },
    format: { type: 'string', description: '输出格式: raw|html' },
    sanitize: { type: 'boolean', description: '是否脱敏' },
  },
});

const ttsTool = new FunctionTool('generate_tts', async (params) => {
  const { gatewayRoute } = await import('../../gateway/aiGatewayHub.js');

  const result = await gatewayRoute({
    mode: 'single',
    taskType: 'tts',
    params: {
      model: 'edge-tts',
      messages: [{ role: 'user', content: params.text }],
      voice: params.voice || 'zh-CN-XiaoxiaoNeural',
      speed: params.speed || 1.0,
    },
  });

  return {
    audioUrl: result?.output?.audioUrl || result?.url || null,
    text: params.text,
    voice: params.voice || 'zh-CN-XiaoxiaoNeural',
    duration: result?.output?.duration || null,
  };
}, {
  description: '语音配音生成（TTS）',
  parameters: {
    text: { type: 'string', description: '配音文本' },
    voice: { type: 'string', description: '音色' },
    speed: { type: 'number', description: '语速 0.5-2.0' },
  },
});

const videoComposeTool = new FunctionTool('compose_video', async (params) => {
  const { submitJob } = await import('../../services/job-queue.service.js');
  return submitJob(params.userId, 'multi_image_to_video', {
    images: params.images || [],
    prompt: params.script || '',
    duration: params.duration || 30,
    ratio: params.ratio || '9:16',
    transition: params.transition || 'fade',
  }, { priority: 5 });
}, {
  description: '多图合成视频（分镜图+配音→完整视频）',
  parameters: {
    userId: { type: 'number', description: '用户ID' },
    images: { type: 'string', description: '图片URL数组JSON' },
    script: { type: 'string', description: '对应脚本文案' },
    duration: { type: 'number', description: '视频时长(秒)' },
    ratio: { type: 'string', description: '比例' },
    transition: { type: 'string', description: '转场效果' },
  },
});

// ==================== Agent 定义 ====================

export class ContentDispatchAgent extends BaseAgent {
  constructor() {
    super({
      name: 'content_dispatch',
      description: '调度力 — 提示词封装+多模型调度+配音+视频合成+后处理',
      tools: [dispatchTool, postProcessTool, ttsTool, videoComposeTool],
      outputKey: 'dispatch_result',
    });
  }

  async _runAsyncImpl(ctx) {
    const state = ctx.session.state.getAll();
    const userInput = state.userInput || '';
    const systemPrompt = state.wrappedSystemPrompt || '';
    const taskType = state.taskType || 'text_gen';
    const userId = state.userId;
    const needsVoice = state.needsVoice || false;
    const needsVideo = state.needsVideo || false;
    const storyboardFrames = state.storyboardFrames || [];

    logger.info('[DispatchAgent] Starting', { taskType, needsVoice, needsVideo });

    const result = { modelOutput: null, postProcessed: null, voice: null, video: null };

    // Step 1: 模型调度
    try {
      result.modelOutput = await dispatchTool.fn({
        mode: 'auto',
        taskType,
        systemPrompt,
        userMessage: userInput,
        temperature: 0.7,
      });
      logger.info('[DispatchAgent] Model dispatch complete');
    } catch (err) {
      logger.error('[DispatchAgent] Dispatch failed:', err.message);
      throw err;
    }

    // Step 2: 输出后处理
    if (result.modelOutput) {
      try {
        const rawText = result.modelOutput?.output?.choices?.[0]?.message?.content
          || result.modelOutput?.text || result.modelOutput?.content || '';
        result.postProcessed = await postProcessTool.fn({
          output: typeof rawText === 'string' ? rawText : JSON.stringify(rawText),
          format: 'html',
          sanitize: true,
        });
      } catch (err) {
        logger.warn('[DispatchAgent] Post-processing failed:', err.message);
      }
    }

    // Step 3: TTS 配音
    if (needsVoice && result.modelOutput) {
      try {
        const rawText = result.modelOutput?.output?.choices?.[0]?.message?.content
          || result.modelOutput?.text || '';
        const voiceText = typeof rawText === 'string' ? rawText.slice(0, 500) : '';
        if (voiceText) {
          result.voice = await ttsTool.fn({ text: voiceText });
          logger.info('[DispatchAgent] TTS generated');
        }
      } catch (err) {
        logger.warn('[DispatchAgent] TTS failed:', err.message);
      }
    }

    // Step 4: 视频合成
    if (needsVideo && storyboardFrames.length > 0 && userId) {
      try {
        result.video = await videoComposeTool.fn({
          userId,
          images: JSON.stringify(storyboardFrames),
          script: userInput,
          duration: state.videoDuration || 30,
        });
        logger.info('[DispatchAgent] Video composed');
      } catch (err) {
        logger.warn('[DispatchAgent] Video composition failed:', err.message);
      }
    }

    logger.info('[DispatchAgent] Complete');
    return result;
  }
}

export const contentDispatchAgent = new ContentDispatchAgent();
