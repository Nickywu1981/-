/**
 * 电商全能AI Agent 编排器
 *
 * 6 Agent 协同 + 4 条强制业务链路：
 *   链路1: 白底图全链路（爆款核心）
 *   链路2: 普通产品图链路
 *   链路3: 爆款复刻链路
 *   链路4: 通用图文链路
 *
 * 全局铁律：禁止裸调模型，所有请求必须经过Agent中间层
 * 视频铁律：禁止一键直出，必须先脚本→分镜→合成
 */
import { SequentialAgent, ParallelAgent } from './index.js';
import { intentAgent } from '../agents/intentAgent.js';
import { GuardAgent } from '../agents/guardAgent.js';
import { expandAgent } from '../agents/expandAgent.js';
import { detailPageAgent } from '../agents/detailAgent.js';
import { scriptStoryboardAgent } from '../agents/storyboardAgent.js';
import { contentDispatchAgent } from '../agents/dispatchAgent.js';
import { InvocationContext } from '../core/invocationContext.js';
import { Session } from '../core/session.js';
import logger from '../../utils/logger.js';
import { BusinessError } from '../../utils/businessError.js';
import { classifyIntent } from '../../services/intentClassifier.js';
import { isBlocked } from '../../services/adComplianceEngine.js';
import { wrapPrompt } from '../../services/promptWrapper.js';
import { rememberSession } from '../../services/ltmEnhancer.js';
import { WorkingMemory } from '../../services/workingMemory.js';
import { ERROR_CODE } from '../../constants/errorCode.js';

// ==================== 链路1: 白底图全链路 ====================
// 白底图 → 意图识别 → 合规校验 → 批量扩图 → 详情页全套 → 脚本分镜 → 分镜合成视频 → 配音字幕

const whiteBgPipeline = new SequentialAgent({
  name: 'white_bg_pipeline',
  description: '白底图全链路：扩图→详情→脚本→分镜→视频合成→配音',
  subAgents: [
    intentAgent,
    GuardAgent,
    expandAgent,
    detailPageAgent,
    scriptStoryboardAgent,
    contentDispatchAgent,
  ],
});

// ==================== 链路2: 普通产品图链路 ====================
// 产品图 → 扩图 → 详情 → 脚本分镜 → 视频 → 配音

const productImagePipeline = new SequentialAgent({
  name: 'product_image_pipeline',
  description: '普通产品图链路：扩图→详情→脚本分镜→视频→配音',
  subAgents: [
    intentAgent,
    GuardAgent,
    expandAgent,
    detailPageAgent,
    scriptStoryboardAgent,
    contentDispatchAgent,
  ],
});

// ==================== 链路3: 爆款复刻链路 ====================
// 上传爆款视频 → Agent反推拆解 → 生成专属脚本分镜 → 生成对应画面 → 合成投流视频

const viralClonePipeline = new SequentialAgent({
  name: 'viral_clone_pipeline',
  description: '爆款复刻链路：拆解爆款→脚本分镜→画面生成→视频合成',
  subAgents: [
    intentAgent,
    GuardAgent,
    scriptStoryboardAgent,   // 先做爆款分析
    expandAgent,              // 生成匹配画面
    contentDispatchAgent,     // 合成视频
  ],
});

// ==================== 链路4: 通用图文链路 ====================
// 需求 → 意图识别 → 合规 → 模板匹配 → 提示词封装 → 多模型生成 → 后处理输出

const generalTextImagePipeline = new SequentialAgent({
  name: 'general_text_image_pipeline',
  description: '通用图文链路：意图→合规→模板→封装→生成→后处理',
  subAgents: [
    intentAgent,
    GuardAgent,
    contentDispatchAgent,
  ],
});

// ==================== 编排器主入口 ====================

const PIPELINE_MAP = {
  white_bg: whiteBgPipeline,
  product_image: productImagePipeline,
  viral_clone: viralClonePipeline,
  general: generalTextImagePipeline,
};

/**
 * 执行电商Agent全链路处理
 *
 * @param {object} params
 * @param {string} params.userInput       用户输入
 * @param {string} [params.productName]   商品名称
 * @param {string} [params.imageUrl]      商品图URL（白底/产品图链路必填）
 * @param {string} [params.referenceVideoUrl] 参考视频URL（爆款复刻链路）
 * @param {string} [params.platform]      目标平台
 * @param {string} [params.industry]      行业
 * @param {number} [params.userId]        用户ID
 * @param {string} [params.ip]            客户端IP
 * @param {number} [params.videoDuration] 视频时长(秒), 默认30
 * @param {boolean} [params.needsVoice]   是否需要配音
 * @param {object} [params.extra]         额外参数
 * @returns {object} 全链路结果
 */
export async function runEcommercePipeline(params = {}) {
  const startTime = Date.now();
  const {
    userInput, productName, imageUrl, referenceVideoUrl,
    platform = 'taobao', industry, userId, ip,
    videoDuration = 30, needsVoice = false, extra = {},
  } = params;

  if (!userInput || !userInput.trim()) {
    throw new BusinessError(ERROR_CODE.PARAM_MISSING);
  }

  // ── Step 0: 前置合规快速拦截 ──
  const blockResult = isBlocked(userInput, { platform, industry });
  if (blockResult.blocked) {
    throw Object.assign(new BusinessError(ERROR_CODE.VALIDATION_ERROR, blockResult.reason), {
      suggestion: blockResult.suggestion,
      stage: 'pre_compliance',
    });
  }

  // ── Step 0.5: 提示词强制封装 ──
  const wrapResult = await wrapPrompt(userInput, {
    userId, platform, industry,
    variables: {
      productName: productName || '未指定商品',
      platform,
      ...extra,
    },
  });

  if (wrapResult.blocked) {
    throw new BusinessError(ERROR_CODE.CONTENT_MODERATION, wrapResult.blockReason || 'Content non-compliant');
  }

  // ── Step 1: 自动意图识别 → 选择链路 ──
  const intent = wrapResult.intent || await classifyIntent(userInput, { platform });
  const pipelineKey = _selectPipeline(intent, imageUrl, referenceVideoUrl);

  logger.info('[Orchestrator] Pipeline selected', {
    pipeline: pipelineKey,
    intentId: intent?.intentId,
    category: intent?.category,
  });

  // ── Step 2: 创建执行上下文 ──
  const session = new Session({ userId: userId || 'anonymous' });
  const ctx = new InvocationContext({ session });
  const wm = new WorkingMemory();

  // 注入全局状态
  ctx.setState('userInput', userInput);
  ctx.setState('productName', productName || '');
  ctx.setState('imageUrl', imageUrl || '');
  ctx.setState('referenceVideoUrl', referenceVideoUrl || '');
  ctx.setState('referenceImageUrl', imageUrl || '');
  ctx.setState('platform', platform);
  ctx.setState('industry', industry || '');
  ctx.setState('userId', userId);
  ctx.setState('ip', ip);

  // 工作记忆: 存储当前任务上下文
  if (productName) wm.set('product', productName, 1);
  wm.set('platform', platform, 1);
  if (industry) wm.set('industry', industry, 1);
  ctx.setState('videoDuration', videoDuration);
  ctx.setState('needsVoice', needsVoice);

  // 注入提示词封装结果
  ctx.setState('wrappedSystemPrompt', wrapResult.wrapped?.system || '');
  ctx.setState('intentId', intent?.intentId);
  ctx.setState('taskType', _intentToTaskType(intent));
  ctx.setState('sellingPoints', extra.sellingPoints || '');
  ctx.setState('specs', extra.specs || '');

  // 是否触发视频链路
  const needsVideo = ['white_bg', 'product_image', 'viral_clone'].includes(pipelineKey)
    && intent?.category === 'video';
  ctx.setState('needsVideo', needsVideo);

  // ── Step 3: 执行链路 ──
  const pipeline = PIPELINE_MAP[pipelineKey];
  let agentResults;

  try {
    agentResults = await pipeline.runAsync(ctx);
  } catch (err) {
    wm.set('pipeline_error', err.message, 2);
    wm.flushToLTM(userId).catch(() => {});
    logger.error('[Orchestrator] Pipeline execution failed', {
      pipeline: pipelineKey,
      error: err.message,
    });
    throw new BusinessError(ERROR_CODE.INTERNAL_ERROR, `Agent chain execution failed: ${err.message}`);
  }

  // ── Step 4: 收集输出 ──
  const output = _collectOutput(ctx, agentResults, pipelineKey);

  const totalMs = Date.now() - startTime;
  logger.info('[Orchestrator] Pipeline complete', {
    pipeline: pipelineKey,
    totalMs,
    intentId: intent?.intentId,
  });

  // 情节记忆: 记住本次会话 + 工作记忆刷新
  rememberSession(ctx.session.id, userId, ctx.session).catch(e => logger.warn('[Orchestrator] Session memory recording failed', { error: e.message }));
  wm.set('pipeline', pipelineKey, 2);
  wm.flushToLTM(userId).catch(e => logger.warn('[Orchestrator] Working memory flush failed', { error: e.message }));

  return {
    success: true,
    pipeline: pipelineKey,
    intent: {
      id: intent?.intentId,
      category: intent?.category,
      label: intent?.label,
      confidence: intent?.confidence,
    },
    ...output,
    meta: {
      pipelineMs: totalMs,
      agentCount: pipeline.subAgents.length,
      pipelineKey,
    },
  };
}

// ==================== 单Agent微调用 ====================

/**
 * 人工微调：单独重新执行某个Agent
 */
export async function rerunSingleAgent(agentName, params) {
  const session = new Session({ userId: params.userId || 'anonymous' });
  const ctx = new InvocationContext({ session });

  Object.entries(params.state || {}).forEach(([k, v]) => ctx.setState(k, v));

  const agentMap = {
    intent: intentAgent,
    guard: GuardAgent,
    expand: expandAgent,
    detail: detailPageAgent,
    storyboard: scriptStoryboardAgent,
    dispatch: contentDispatchAgent,
  };

  const agent = agentMap[agentName];
  if (!agent) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND, `Unknown agent: ${agentName}`);

  return agent.runAsync(ctx);
}

// ==================== 内部辅助 ====================

function _selectPipeline(intent, imageUrl, referenceVideoUrl) {
  if (referenceVideoUrl) return 'viral_clone';
  if (imageUrl) return 'white_bg';
  if (intent?.category === 'video') return 'product_image';
  return 'general';
}

function _intentToTaskType(intent) {
  const map = {
    image: 'image_gen',
    video: 'video_gen',
    text: 'text_gen',
    detail: 'text_gen',
    voice: 'tts',
  };
  return map[intent?.category] || 'text_gen';
}

function _collectOutput(ctx, agentResults, pipelineKey) {
  const state = ctx.session.state.getAll();
  const results = Array.isArray(agentResults) ? agentResults : [agentResults];

  const expandResult = state.expand_result || results.find(r => r?.generated) || {};
  const detailResult = state.detail_result || results.find(r => r?.layout) || {};
  const storyResult = state.storyboard_result || results.find(r => r?.summary) || {};
  const dispatchResult = state.dispatch_result || results[results.length - 1] || {};

  return {
    // 素材扩展输出
    materials: {
      whiteBg: expandResult?.whiteBg || null,
      angles: expandResult?.angles?.images || [],
      scenes: expandResult?.scenes?.images || [],
      details: expandResult?.details?.images || [],
      allUrls: expandResult?.allUrls || [],
    },
    // 详情页输出
    detailPage: {
      modules: detailResult?.modules?.modules || [],
      sellingPoints: detailResult?.sellingPoints || [],
      layout: detailResult?.layout || null,
    },
    // 脚本分镜输出
    scriptStoryboard: {
      viralFormula: storyResult?.viralAnalysis?.viralFormula || null,
      script: storyResult?.script || null,
      storyboardFrames: storyResult?.storyboard?.frames || [],
      summary: storyResult?.summary || null,
    },
    // 最终输出
    final: {
      content: dispatchResult?.postProcessed || dispatchResult?.modelOutput || null,
      voice: dispatchResult?.voice || null,
      video: dispatchResult?.video || null,
    },
  };
}

export default { runEcommercePipeline, rerunSingleAgent };
