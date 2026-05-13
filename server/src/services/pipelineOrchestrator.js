/**
 * 电商全能AI Agent 总编排器 — 薄包装层
 *
 * 委托 unifiedWorkflowEngine 执行，不再持有独立的链逻辑。
 * 输入类型 → workflowId 映射：
 *   image_url → white_bg_full
 *   video_url → viral_clone
 *   text+productName+sellPoints → white_bg_full
 *   text only → copywriting_script
 *
 * 核心铁则：
 *   - 严禁跳过管线直接调用模型
 *   - 视频生成必须有分镜表
 *   - 每步可暂停等待人工微调
 */
import { executeWorkflow, resumeJob } from './unifiedWorkflowEngine.js';
import logger from '../utils/logger.js';
import { BusinessError } from '../utils/businessError.js';

// ==================== 链步骤元数据(向后兼容) ====================

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

// ==================== 输入 → 工作流ID映射 ====================

function _mapToWorkflowId(params) {
  const inputType = detectInputType(params.input);
  if (params.chain) return null; // 自定义链走旧逻辑

  if (inputType === 'image_url') return 'white_bg_full';
  if (inputType === 'video_url') return 'viral_clone';
  if (params.productName && (params.sellingPoints?.length || params.specs)) return 'white_bg_full';
  return 'copywriting_script';
}

function _buildWorkflowInput(params) {
  return {
    userInput: typeof params.input === 'string' ? params.input : JSON.stringify(params.input || ''),
    productName: params.productName || '',
    imageUrl: typeof params.input === 'string' && detectInputType(params.input) === 'image_url' ? params.input : params.imageUrl || '',
    referenceVideoUrl: typeof params.input === 'string' && detectInputType(params.input) === 'video_url' ? params.input : params.videoUrl || '',
    platform: params.platform || 'taobao',
    industry: params.industry || null,
    sellingPoints: (params.sellingPoints || []).join(','),
    productFeatures: params.productFeatures || '',
    videoDuration: params.duration || 30,
    storyboardCount: params.shotCount || 6,
    extra: {
      brandTone: params.brandTone,
      specs: params.specs || {},
      audioConfig: params.audioConfig || {},
    },
    userId: params.ctx?.userId,
  };
}

// ==================== 主编排入口 ====================

/**
 * 全自动编排 — 委托 unifiedWorkflowEngine.executeWorkflow
 */
export async function orchestrate(params = {}) {
  const inputType = detectInputType(params.input);
  const workflowId = _mapToWorkflowId(params);

  if (!workflowId) {
    throw new BusinessError(400, `无法自动匹配工作流: inputType=${inputType}, 请手动指定 chain`);
  }

  logger.info(`[Orchestrator] delegating to engine: workflow=${workflowId} inputType=${inputType}`);

  const input = _buildWorkflowInput(params);
  const overrides = {
    disabledSteps: params.overrides?.disabledSteps || params.pausePoints?.after || [],
    modelBindings: params.overrides?.modelBindings || {},
    extraSteps: params.overrides?.extraSteps || [],
  };

  try {
    const result = await executeWorkflow({
      workflowId,
      mode: params.mode || 'auto',
      input,
      overrides,
    });

    return {
      chainId: result.jobId,
      chainType: workflowId,
      inputType,
      steps: [],
      outputs: result,
      summary: {
        totalSteps: result.totalSteps,
        completed: result.status === 'completed' ? result.totalSteps : 0,
        failed: result.status === 'failed' ? 1 : 0,
        paused: 0,
        success: result.status === 'completed',
      },
    };
  } catch (err) {
    logger.error(`[Orchestrator] workflow failed: ${err.message}`);
    return {
      chainId: `chain_${Date.now()}`,
      chainType: workflowId,
      inputType,
      steps: [{ step: 'error', status: 'failed', error: err.message, elapsed: 0 }],
      outputs: {},
      summary: { totalSteps: 0, completed: 0, failed: 1, paused: 0, success: false },
    };
  }
}

/**
 * 人工微调后继续 — 委托 resumeJob
 */
export async function resumeOrchestration(chainState, resumeFromStep, overrides = {}, ctx = {}) {
  if (!chainState?.chainId) {
    throw new BusinessError(400, 'chainState.chainId 必填');
  }

  const jobId = chainState.chainId.startsWith('wf_') ? chainState.chainId : chainState.chainId;

  logger.info(`[Orchestrator] resuming job: ${jobId} from step: ${resumeFromStep}`);

  try {
    const result = await resumeJob(jobId, { ...ctx, ...overrides });
    return {
      ...chainState,
      outputs: result,
      summary: {
        totalSteps: chainState.summary?.totalSteps || 0,
        completed: chainState.summary?.completed || 0,
        failed: 0,
        paused: 0,
        success: true,
      },
    };
  } catch (err) {
    logger.error(`[Orchestrator] resume failed: ${err.message}`);
    return {
      ...chainState,
      summary: { ...chainState.summary, failed: 1, success: false },
    };
  }
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
      suggestion: '请调用 /api/workflow/execute 全自动编排，或先通过脚本分镜步骤生成分镜表',
    };
  }

  return { blocked: false };
}

export { CHAIN_STEPS, detectInputType };
export default { orchestrate, resumeOrchestration, blockDirectVideoGeneration, CHAIN_STEPS };
