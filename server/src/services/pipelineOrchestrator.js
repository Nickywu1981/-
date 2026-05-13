/**
 * 电商全能AI Agent 总编排器
 *
 * 四条强制业务链，自动识别输入类型并串联全部 Agent：
 *   Chain A (白底图全链):  图片 → Agent3扩图 → Agent4详情页 → Agent5脚本分镜 → Agent6视频合成
 *   Chain B (产品信息链):  文字 → Agent1意图 → Agent2合规 → Agent4详情页 → Agent3扩图 → Agent5脚本分镜 → Agent6视频
 *   Chain C (爆款复刻链):  视频URL → Agent5反推 → Agent3扩图 → Agent6视频合成
 *   Chain D (通用文案链):  文字 → Agent1意图 → Agent2合规 → 模板匹配 → Agent6内容生成
 *
 * 核心铁则：
 *   - 严禁跳过管线直接调用模型
 *   - 视频生成必须有分镜表
 *   - 每步可暂停等待人工微调
 */
import { classifyIntent } from './intentClassifier.js';
import { checkCompliance } from './adComplianceEngine.js';
import { matchAndFill } from './templateEngine.js';
import { expandImages } from './expansionAgent.js';
import { generateDetailPage } from './detailPageAgent.js';
import { generateScriptAndStoryboard, analyzeViralAndClone } from './scriptStoryboardAgent.js';
import { composeVideo, generateContent } from './contentOrchestrator.js';
import logger from '../utils/logger.js';
import { BusinessError } from '../utils/businessError.js';

// ==================== 链步骤定义 ====================

const CHAIN_STEPS = {
  intent_classify:  { order: 1,  agent: 'Agent1', label: '意图识别',       category: 'analysis' },
  compliance_check: { order: 2,  agent: 'Agent2', label: '合规校验',       category: 'analysis' },
  template_match:   { order: 3,  agent: 'Agent2', label: '模板匹配',       category: 'prep' },
  expand_images:    { order: 4,  agent: 'Agent3', label: '素材扩图',       category: 'generation' },
  detail_page:      { order: 5,  agent: 'Agent4', label: '详情页生成',     category: 'generation' },
  script_storyboard:{ order: 6,  agent: 'Agent5', label: '脚本分镜生成',   category: 'generation' },
  video_compose:    { order: 7,  agent: 'Agent6', label: '视频合成配音',   category: 'generation' },
  content_generate: { order: 8,  agent: 'Agent6', label: '内容生成',       category: 'generation' },
  viral_analyze:    { order: 5,  agent: 'Agent5', label: '爆款反推拆解',   category: 'analysis' },
};

// ==================== 输入类型检测 ====================

function detectInputType(input) {
  if (!input) return 'text';
  if (typeof input === 'string') {
    if (/^https?:\/\/.+\.(mp4|mov|avi|webm|flv)(\?.*)?$/i.test(input)) return 'video_url';
    if (/^https?:\/\/.+\.(jpg|jpeg|png|webp|gif|bmp)(\?.*)?$/i.test(input)) return 'image_url';
    if (/^https?:\/\//.test(input)) return 'url';
    return 'text';
  }
  if (input.imageUrl) return 'image_url';
  if (input.videoUrl) return 'video_url';
  return 'text';
}

// ==================== 主编排入口 ====================

/**
 * 全自动编排 — 输入一张图/视频链接/文字，全自动产出全部内容
 */
export async function orchestrate(params = {}) {
  const input = params.input || '';
  const platform = params.platform || 'taobao';
  const industry = params.industry || null;
  const brandTone = params.brandTone || 'professional';
  const ctx = params.ctx || {};

  const inputType = detectInputType(input);
  const chainId = `chain_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  logger.info(`[Orchestrator] starting chain ${chainId}, inputType=${inputType}`);

  const steps = [];
  const outputs = {};
  let chainType = 'unknown';

  try {
    if (params.chain) {
      chainType = 'custom';
      await _runCustomChain(params.chain, params, steps, outputs, ctx);
    } else if (inputType === 'image_url') {
      chainType = 'A_white_bg_full';
      await _runChainA(input, params, steps, outputs, ctx);
    } else if (inputType === 'video_url') {
      chainType = 'C_viral_clone';
      await _runChainC(input, params, steps, outputs, ctx);
    } else if (params.productName && (params.sellingPoints || params.specs)) {
      chainType = 'B_product_full';
      await _runChainB(input, params, steps, outputs, ctx);
    } else {
      chainType = 'D_text_general';
      await _runChainD(input, params, steps, outputs, ctx);
    }
  } catch (err) {
    logger.error(`[Orchestrator] chain ${chainId} failed at step ${steps.length}: ${err.message}`);
    steps.push({ step: 'error', status: 'failed', error: err.message, elapsed: 0 });
  }

  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const failedSteps = steps.filter(s => s.status === 'failed').length;

  return {
    chainId,
    chainType,
    inputType,
    steps,
    outputs,
    summary: {
      totalSteps: steps.length,
      completed: completedSteps,
      failed: failedSteps,
      paused: steps.filter(s => s.status === 'paused').length,
      success: failedSteps === 0,
    },
  };
}

/**
 * 人工微调后继续执行 — 从指定步骤恢复
 */
export async function resumeOrchestration(chainState, resumeFromStep, overrides = {}, ctx = {}) {
  logger.info(`[Orchestrator] resuming chain ${chainState.chainId} from step: ${resumeFromStep}`);

  const remainingSteps = _getRemainingSteps(chainState.chainType, resumeFromStep);
  const steps = [...(chainState.steps || [])];
  const outputs = { ...(chainState.outputs || {}) };
  const params = { ...chainState._params, ...overrides, ctx };

  await _runCustomChain(remainingSteps, params, steps, outputs, ctx);

  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const failedSteps = steps.filter(s => s.status === 'failed').length;

  return {
    ...chainState,
    steps,
    outputs,
    summary: {
      totalSteps: steps.length,
      completed: completedSteps,
      failed: failedSteps,
      paused: 0,
      success: failedSteps === 0,
    },
  };
}

// ==================== Chain A: 白底图全链 ====================

async function _runChainA(imageUrl, params, steps, outputs, ctx) {
  const platform = params.platform || 'taobao';
  const industry = params.industry || 'clothing';
  const brandTone = params.brandTone || 'professional';
  const productName = params.productName || '商品';
  const sellingPoints = params.sellingPoints || [];
  const specs = params.specs || {};
  const audioConfig = params.audioConfig || {};
  const overrides = params.overrides || {};

  // Step 1: 扩图
  const expandResult = await _step('expand_images', async () => {
    return await expandImages(imageUrl, {
      types: ['main_image', 'scene_image', 'detail_image', 'storyboard'],
      productName,
      platform,
      industry,
      shotCount: overrides.script_storyboard?.shotCount || 6,
      ctx,
    });
  }, steps, outputs);

  // Step 2: 详情页
  await _step('detail_page', async () => {
    return await generateDetailPage({
      productName,
      category: industry,
      platform,
      industry,
      brandTone,
      sellingPoints,
      specs,
      imageUrls: expandResult.images?.main_image || [],
      ctx,
    });
  }, steps, outputs);

  // Step 3: 脚本分镜
  const storyboardResult = await _step('script_storyboard', async () => {
    return await generateScriptAndStoryboard({
      productName,
      platform: platform === 'taobao' ? 'douyin' : platform,
      contentType: 'ad',
      shotCount: overrides.script_storyboard?.shotCount || 6,
      duration: overrides.script_storyboard?.duration || 30,
      sellingPoints,
      hookStyle: overrides.script_storyboard?.hookStyle || 'question',
      ctx,
    });
  }, steps, outputs);

  // Step 4: 视频合成
  await _step('video_compose', async () => {
    return await composeVideo({
      storyboard: storyboardResult.storyboard,
      script: storyboardResult.script,
      audio: {
        voiceStyle: audioConfig.voiceStyle || 'female',
        gender: audioConfig.gender || 'female',
        speed: audioConfig.speed || 1.0,
        bgm: audioConfig.bgm || 'upbeat_light',
      },
      ctx,
    });
  }, steps, outputs);
}

// ==================== Chain B: 产品信息全链 ====================

async function _runChainB(input, params, steps, outputs, ctx) {
  const platform = params.platform || 'taobao';
  const industry = params.industry || 'clothing';
  const brandTone = params.brandTone || 'professional';
  const productName = params.productName || '商品';
  const sellingPoints = params.sellingPoints || [];
  const specs = params.specs || {};
  const audioConfig = params.audioConfig || {};
  const overrides = params.overrides || {};

  // Step 1: 意图识别
  await _step('intent_classify', async () => {
    return await classifyIntent(typeof input === 'string' ? input : productName, {
      userId: ctx.userId,
      platform,
    });
  }, steps, outputs);

  // Step 2: 合规校验
  const complianceResult = await _step('compliance_check', async () => {
    return checkCompliance(typeof input === 'string' ? input : productName, {
      platform,
      industry,
    });
  }, steps, outputs);

  if (!complianceResult.passed) {
    steps.push({ step: 'chain_blocked', status: 'failed', error: '合规校验不通过', details: complianceResult.violations, elapsed: 0 });
    return;
  }

  // Step 3: 详情页
  await _step('detail_page', async () => {
    return await generateDetailPage({
      productName,
      category: industry,
      platform,
      industry,
      brandTone,
      sellingPoints,
      specs,
      imageUrls: outputs.expand_images?.images?.main_image || [],
      ctx,
    });
  }, steps, outputs);

  // Step 4: 扩图
  const expandResult = await _step('expand_images', async () => {
    return await expandImages(params.imageUrl || '', {
      types: ['main_image', 'scene_image', 'detail_image', 'storyboard'],
      productName,
      platform,
      industry,
      shotCount: overrides.script_storyboard?.shotCount || 6,
      ctx,
    });
  }, steps, outputs);

  // Step 5: 脚本分镜
  const storyboardResult = await _step('script_storyboard', async () => {
    return await generateScriptAndStoryboard({
      productName,
      platform: platform === 'taobao' ? 'douyin' : platform,
      contentType: 'ad',
      shotCount: overrides.script_storyboard?.shotCount || 6,
      duration: overrides.script_storyboard?.duration || 30,
      sellingPoints,
      hookStyle: overrides.script_storyboard?.hookStyle || 'question',
      ctx,
    });
  }, steps, outputs);

  // Step 6: 视频合成
  await _step('video_compose', async () => {
    return await composeVideo({
      storyboard: storyboardResult.storyboard,
      script: storyboardResult.script,
      audio: {
        voiceStyle: audioConfig.voiceStyle || 'female',
        gender: audioConfig.gender || 'female',
        speed: audioConfig.speed || 1.0,
        bgm: audioConfig.bgm || 'upbeat_light',
      },
      ctx,
    });
  }, steps, outputs);
}

// ==================== Chain C: 爆款复刻链 ====================

async function _runChainC(videoUrl, params, steps, outputs, ctx) {
  const productName = params.productName || '商品';
  const platform = params.platform || 'douyin';
  const industry = params.industry || 'clothing';
  const audioConfig = params.audioConfig || {};

  // Step 1: 爆款反推 + 克隆脚本分镜
  const viralResult = await _step('viral_analyze', async () => {
    return await analyzeViralAndClone(videoUrl, productName, ctx);
  }, steps, outputs);

  // Step 2: 扩图
  await _step('expand_images', async () => {
    return await expandImages(params.referenceImage || videoUrl, {
      types: ['storyboard', 'main_image', 'scene_image'],
      productName,
      platform,
      industry,
      shotCount: viralResult.clonedStoryboard?.length || 6,
      ctx,
    });
  }, steps, outputs);

  // Step 3: 视频合成
  await _step('video_compose', async () => {
    return await composeVideo({
      storyboard: viralResult.clonedStoryboard,
      script: viralResult.clonedScript,
      audio: {
        voiceStyle: audioConfig.voiceStyle || 'female',
        gender: audioConfig.gender || 'female',
        speed: audioConfig.speed || 1.0,
        bgm: audioConfig.bgm || 'upbeat_light',
      },
      ctx,
    });
  }, steps, outputs);
}

// ==================== Chain D: 通用文案链 ====================

async function _runChainD(input, params, steps, outputs, ctx) {
  const platform = params.platform || 'taobao';
  const industry = params.industry || null;
  const brandTone = params.brandTone || 'professional';

  await _step('intent_classify', async () => {
    return await classifyIntent(typeof input === 'string' ? input : String(input), {
      userId: ctx.userId,
      platform,
    });
  }, steps, outputs);

  const complianceResult = await _step('compliance_check', async () => {
    return checkCompliance(typeof input === 'string' ? input : String(input), {
      platform,
      industry,
    });
  }, steps, outputs);

  if (!complianceResult.passed) {
    steps.push({ step: 'chain_blocked', status: 'failed', error: '合规校验不通过', details: complianceResult.violations, elapsed: 0 });
    return;
  }

  await _step('template_match', async () => {
    const intent = outputs.intent_classify;
    return matchAndFill(intent?.intentId || 'copywriting', {
      productName: params.productName || '商品',
      ...(params.variables || {}),
    }, { industry, platform, brandTone });
  }, steps, outputs);

  await _step('content_generate', async () => {
    return await generateContent(typeof input === 'string' ? input : JSON.stringify(input), {
      platform,
      industry,
      brandTone,
      variables: params.variables || {},
      ctx,
    });
  }, steps, outputs);
}

// ==================== 自定义链 ====================

async function _runCustomChain(stepIds, params, steps, outputs, ctx) {
  const stepMap = {
    intent_classify: async () => {
      const input = params.input || params.productName || '';
      return await classifyIntent(typeof input === 'string' ? input : String(input), {
        userId: ctx.userId,
        platform: params.platform,
      });
    },
    compliance_check: async () => {
      const input = params.input || params.productName || '';
      return checkCompliance(typeof input === 'string' ? input : String(input), {
        platform: params.platform || 'taobao',
        industry: params.industry || null,
      });
    },
    template_match: async () => {
      const intent = outputs.intent_classify;
      return matchAndFill(intent?.intentId || 'copywriting', {
        productName: params.productName || '商品',
        ...(params.variables || {}),
      }, { industry: params.industry, platform: params.platform, brandTone: params.brandTone });
    },
    expand_images: async () => {
      return await expandImages(params.imageUrl || params.input || '', {
        types: ['main_image', 'scene_image', 'detail_image', 'storyboard'],
        productName: params.productName || '商品',
        platform: params.platform || 'taobao',
        industry: params.industry || null,
        shotCount: params.shotCount || 6,
        ctx,
      });
    },
    detail_page: async () => {
      return await generateDetailPage({
        productName: params.productName || '商品',
        category: params.industry || 'clothing',
        platform: params.platform || 'taobao',
        industry: params.industry || null,
        brandTone: params.brandTone || 'professional',
        sellingPoints: params.sellingPoints || [],
        specs: params.specs || {},
        imageUrls: outputs.expand_images?.images?.main_image || [],
        ctx,
      });
    },
    script_storyboard: async () => {
      return await generateScriptAndStoryboard({
        productName: params.productName || '商品',
        platform: params.platform || 'douyin',
        contentType: 'ad',
        shotCount: params.shotCount || 6,
        duration: params.duration || 30,
        sellingPoints: params.sellingPoints || [],
        hookStyle: params.hookStyle || 'question',
        ctx,
      });
    },
    video_compose: async () => {
      const storyboardResult = outputs.script_storyboard || outputs.viral_analyze;
      if (!storyboardResult?.storyboard || storyboardResult.storyboard.length === 0) {
        throw new BusinessError(422, '视频合成需要分镜表，请先生成脚本分镜');
      }
      return await composeVideo({
        storyboard: storyboardResult.storyboard,
        script: storyboardResult.script || storyboardResult.clonedScript || '',
        audio: {
          voiceStyle: params.audioConfig?.voiceStyle || 'female',
          gender: params.audioConfig?.gender || 'female',
          speed: params.audioConfig?.speed || 1.0,
          bgm: params.audioConfig?.bgm || 'upbeat_light',
        },
        ctx,
      });
    },
    content_generate: async () => {
      return await generateContent(
        typeof params.input === 'string' ? params.input : JSON.stringify(params.input || params.productName || ''),
        {
          platform: params.platform,
          industry: params.industry,
          brandTone: params.brandTone,
          variables: params.variables || {},
          ctx,
        },
      );
    },
    viral_analyze: async () => {
      return await analyzeViralAndClone(params.input || params.videoUrl, params.productName || '商品', ctx);
    },
  };

  for (const stepId of stepIds) {
    const executor = stepMap[stepId];
    if (!executor) {
      logger.warn(`[Orchestrator] unknown step: ${stepId}`);
      steps.push({ step: stepId, status: 'skipped', reason: 'unknown step', elapsed: 0 });
      continue;
    }

    if (params.pausePoints?.after?.includes(stepId)) {
      const prevStep = steps[steps.length - 1];
      if (prevStep && prevStep.status === 'completed') {
        steps.push({ step: `pause_before_${stepId}`, status: 'paused', message: `等待人工确认后继续执行: ${CHAIN_STEPS[stepId]?.label || stepId}`, elapsed: 0 });
        break;
      }
    }

    await _step(stepId, executor, steps, outputs);
  }
}

// ==================== 步骤执行辅助 ====================

async function _step(stepId, executor, steps, outputs) {
  const meta = CHAIN_STEPS[stepId] || { agent: 'Unknown', label: stepId, category: 'execution' };
  const start = Date.now();

  logger.info(`[Orchestrator] executing: ${stepId} (${meta.label})`);

  try {
    const result = await executor();
    const elapsed = Date.now() - start;

    outputs[stepId] = result;
    steps.push({
      step: stepId,
      status: 'completed',
      agent: meta.agent,
      label: meta.label,
      category: meta.category,
      elapsed,
    });

    logger.info(`[Orchestrator] completed: ${stepId} in ${elapsed}ms`);
    return result;
  } catch (err) {
    const elapsed = Date.now() - start;

    steps.push({
      step: stepId,
      status: 'failed',
      agent: meta.agent,
      label: meta.label,
      error: err.message,
      elapsed,
    });

    logger.error(`[Orchestrator] failed: ${stepId} — ${err.message}`);
    throw err;
  }
}

// ==================== 链恢复辅助 ====================

function _getRemainingSteps(chainType, resumeFrom) {
  const chainStepMap = {
    'A_white_bg_full':    ['expand_images', 'detail_page', 'script_storyboard', 'video_compose'],
    'B_product_full':     ['intent_classify', 'compliance_check', 'detail_page', 'expand_images', 'script_storyboard', 'video_compose'],
    'C_viral_clone':      ['viral_analyze', 'expand_images', 'video_compose'],
    'D_text_general':     ['intent_classify', 'compliance_check', 'template_match', 'content_generate'],
  };

  const allSteps = chainStepMap[chainType] || [];
  const idx = allSteps.indexOf(resumeFrom);
  return idx >= 0 ? allSteps.slice(idx) : allSteps;
}

// ==================== 视频直生成阻断器 ====================

/**
 * 网关前置检查 — 拦截无分镜表的视频生成请求
 */
export function blockDirectVideoGeneration(intentId, ctx = {}) {
  const videoIntents = ['main_video', 'ad_video', 'action_migrate', 'video_clone'];
  if (!videoIntents.includes(intentId)) return { blocked: false };

  const hasStoryboard = ctx.storyboard && ctx.storyboard.length > 0;
  const hasSourceChain = ctx.sourceChain === 'orchestrator';

  if (!hasStoryboard && !hasSourceChain) {
    return {
      blocked: true,
      reason: '视频生成必须通过分镜表。请先完成"脚本分镜生成"步骤，或使用全自动编排接口。',
      suggestion: '请调用 /api/ai/pipeline/orchestrate 全自动编排，或先调用 Agent5 生成脚本分镜',
    };
  }

  return { blocked: false };
}

export { CHAIN_STEPS, detectInputType };
export default { orchestrate, resumeOrchestration, blockDirectVideoGeneration, CHAIN_STEPS };
