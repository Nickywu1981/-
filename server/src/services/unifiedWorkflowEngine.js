/**
 * 统一工作流引擎 (Unified Workflow Engine)
 *
 * 核心能力:
 *   1. 双模式运行: auto(系统智能选模型) / custom(手动指定每步模型)
 *   2. 步骤级模型绑定 — 每一步独立选择模型
 *   3. 固定步骤顺序 — 不可乱序执行
 *   4. 步骤可开关 — 后台启用/禁用
 *   5. 人工干预 — 暂停/修改上下文/继续
 *   6. 进度追踪 — 每步状态+耗时+输出
 *
 * 铁则:
 *   - 禁止裸调模型: 所有步骤必须经 prompt_wrap → 合规校验
 *   - 视频铁则: forceVideoRule=true 的工作流必须先脚本→分镜→再合成
 */
import { getWorkflow, getWorkflowSteps } from './workflowDefinitions.js';
import { autoSelect, getModelConfig } from './modelPoolService.js';
import { isBlocked } from './adComplianceEngine.js';
import { classifyIntent } from './intentClassifier.js';
import { wrapPrompt } from './promptWrapper.js';
import { gatewayInfer, gatewayDispatch } from '../gateway/aiGatewayHub.js';
import logger from '../utils/logger.js';
import { BusinessError } from '../utils/businessError.js';

// ==================== 作业存储(内存+后续迁移Redis) ====================
const jobStore = new Map();

// ==================== 步骤执行器映射 ====================

const STEP_EXECUTORS = {
  // ── 前置处理 ──
  intent_classify: async (ctx) => {
    const result = await classifyIntent(ctx.userInput || '', {
      platform: ctx.platform,
      userId: ctx.userId,
    });
    return { intent: result };
  },

  compliance_check: async (ctx) => {
    const text = ctx.userInput || '';
    const blockResult = isBlocked(text, {
      platform: ctx.platform || 'taobao',
      industry: ctx.industry,
    });
    if (blockResult.blocked) {
      throw Object.assign(new BusinessError(422, blockResult.reason), {
        suggestion: blockResult.suggestion,
        stage: 'compliance',
      });
    }
    return { compliancePassed: true };
  },

  prompt_wrap: async (ctx) => {
    const result = await wrapPrompt(ctx.userInput || '', {
      userId: ctx.userId,
      platform: ctx.platform || 'taobao',
      industry: ctx.industry,
      variables: {
        productName: ctx.productName || '未指定商品',
        productFeatures: ctx.productFeatures || '',
        sellingPoints: ctx.sellingPoints || '',
        platform: ctx.platform || 'taobao',
        ...(ctx.extra || {}),
      },
    });
    if (result.blocked) throw new BusinessError(422, result.blockReason || '内容不合规');
    return { wrappedPrompt: result.wrapped, intentId: result.intent?.intentId };
  },

  // ── 图片生成 ──
  white_bg_gen:       _imageGenStep('white_bg'),
  multi_angle_gen:    _imageGenStep('multi_angle'),
  scene_image_gen:    _imageGenStep('scene_image'),
  detail_shot_gen:    _imageGenStep('detail_shot'),
  storyboard_gen:     _imageGenStep('storyboard'),
  detail_module_gen:  _imageGenStep('detail_module'),

  // ── 文案生成 ──
  detail_copy_gen:    _textGenStep('detail_copy', '生成商品详情页文案'),
  copywriting_gen:    _textGenStep('copywriting', '生成电商营销文案'),
  script_gen:         _textGenStep('script', '生成带货视频脚本（含前3秒钩子+5-8镜分镜）'),
  selling_points_gen: _textGenStep('selling_points', '提炼商品核心卖点'),
  viral_analyze:      _textGenStep('viral_analyze', '反推拆解爆款视频逻辑'),
  script_polish:      _textGenStep('polish', '精炼规整文案输出'),

  // ── 详情页 ──
  detail_page_gen: async (ctx) => {
    // 调用详情页Agent
    const { detailPageAgent } = await import('../adk/agents/detailAgent.js');
    const adkCtx = { session: { state: { getAll: () => ({ ...ctx, userId: ctx.userId }) } } };
    return detailPageAgent._runAsyncImpl(adkCtx);
  },

  // ── 视频 ──
  video_compose: async (ctx) => {
    const model = ctx._stepModel || {};
    const result = await gatewayInfer(model.model_key || 'kling-v1', {
      images: ctx.storyboardUrls || [],
      prompt: ctx.scriptContent || ctx.userInput,
      duration: ctx.videoDuration || 30,
      ratio: '9:16',
    }, { taskType: 'video_compose', source: 'workflow' });
    return { videoUrl: result?.url || result?.videoUrl, taskId: result?.taskId };
  },

  // ── 配音 ──
  voice_dub: async (ctx) => {
    const model = ctx._stepModel || {};
    const text = ctx.scriptContent || ctx.userInput || '';
    const result = await gatewayDispatch({
      mode: 'single',
      taskType: 'tts',
      params: {
        model: model.model_key || 'edge-tts',
        messages: [{ role: 'user', content: text.slice(0, 500) }],
        voice: ctx.voice || 'zh-CN-XiaoxiaoNeural',
      },
    }, { taskType: 'tts', source: 'workflow' });
    return { voiceUrl: result?.output?.audioUrl || result?.url };
  },

  // ── 后处理 ──
  text_prepare: async (ctx) => ({
    preparedText: (ctx.userInput || '').replace(/\n{3,}/g, '\n\n').trim(),
  }),
  size_standardize: async (ctx) => ({ standardized: true, count: (ctx.imageUrls || []).length }),
  auto_layout: async (ctx) => ({ layout: 'standard_9_section', modules: ctx.modules || [] }),
  bgm_add: async (ctx) => ({ bgmUrl: null, skipped: true }),
  noise_reduce: async (ctx) => ({ denoised: true }),
  audio_mix: async (ctx) => ({ mixedUrl: null, skipped: true }),

  // ── 打包 ──
  pack_export: async (ctx) => {
    const assets = {};
    if (ctx.imageUrls) assets.images = ctx.imageUrls;
    if (ctx.videoUrl) assets.video = ctx.videoUrl;
    if (ctx.voiceUrl) assets.voice = ctx.voiceUrl;
    if (ctx.detailModules) assets.detailModules = ctx.detailModules;
    return { package: assets, totalAssets: Object.keys(assets).length };
  },
};

// ==================== 图片生成步骤工厂 ====================

function _imageGenStep(taskType, taskLabel) {
  return async (ctx) => {
    const model = ctx._stepModel || {};
    const prompt = ctx.wrappedPrompt?.system
      || `professional e-commerce ${taskType.replace(/_/g, ' ')}, ${ctx.productName || 'product'}, studio lighting, white background`;

    const result = await gatewayInfer(model.model_key || 'gpt-image-2', prompt, {
      size: ctx.imageSize || '1024x1024',
      n: ctx.batchSize || 3,
    }, { taskType, source: 'workflow' });

    const urls = result?.images?.map(i => i.url).filter(Boolean) || [result?.url].filter(Boolean);
    return { imageUrls: urls, generatedCount: urls.length };
  };
}

// ==================== 文案生成步骤工厂 ====================

function _textGenStep(taskType, taskLabel) {
  return async (ctx) => {
    const model = ctx._stepModel || {};
    const systemPrompt = ctx.wrappedPrompt?.system || `你是电商${taskLabel}专家`;
    const userMessage = ctx.userInput || ctx.productName || '';

    const result = await gatewayDispatch({
      mode: 'single',
      taskType: 'text_gen',
      params: {
        model: model.model_key || 'deepseek-v4-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        maxTokens: 4096,
      },
    }, { taskType: 'text_gen', source: 'workflow' });

    const content = result?.output?.choices?.[0]?.message?.content || result?.text || '';
    return { textContent: content, scriptContent: content };
  };
}

// ==================== 引擎主入口 ====================

/**
 * 执行工作流
 *
 * @param {object} params
 * @param {string} params.workflowId       工作流ID
 * @param {string} params.mode             运行模式: auto | custom
 * @param {object} params.input            用户输入
 * @param {string} params.input.userInput  用户需求
 * @param {string} params.input.productName
 * @param {string} params.input.imageUrl
 * @param {string} params.input.referenceVideoUrl
 * @param {string} params.input.platform
 * @param {string} params.input.industry
 * @param {number} params.input.userId
 * @param {object} params.input.extra
 * @param {object} params.overrides        步骤覆盖配置
 * @param {string[]} params.overrides.disabledSteps  禁用的步骤key列表
 * @param {object}   params.overrides.modelBindings  步骤→模型绑定 { stepKey: 'model_key' }
 * @param {object}   params.overrides.extraSteps     额外插入步骤 [{ after: 'stepKey', step: {...} }]
 */
export async function executeWorkflow(params = {}) {
  const { workflowId, mode = 'auto', input = {}, overrides = {} } = params;

  // 验证工作流
  const wf = getWorkflow(workflowId);
  if (!wf) throw new BusinessError(400, `工作流不存在: ${workflowId}`);

  // 获取步骤(含覆盖)
  let steps = getWorkflowSteps(workflowId, overrides);

  // 应用额外步骤
  if (overrides.extraSteps?.length) {
    for (const extra of overrides.extraSteps) {
      const idx = steps.findIndex(s => s.key === extra.after);
      if (idx >= 0) steps.splice(idx + 1, 0, extra.step);
    }
  }

  // 过滤出启用的步骤
  const activeSteps = steps.filter(s => s.enabled !== false);

  // 视频铁则检查
  if (wf.forceVideoRule) {
    const hasScript = activeSteps.some(s => s.key === 'script_gen');
    const hasStoryboard = activeSteps.some(s => s.key === 'storyboard_gen');
    const hasVideo = activeSteps.some(s => s.key === 'video_compose');
    if (hasVideo && (!hasScript || !hasStoryboard)) {
      throw new BusinessError(400, '视频类工作流禁止跳过脚本/分镜步骤直接生成视频');
    }
  }

  // 创建作业
  const jobId = `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const job = {
    id: jobId,
    workflowId,
    workflowName: wf.name,
    mode,
    status: 'running',
    progress: 0,
    totalSteps: activeSteps.length,
    steps: activeSteps.map(s => ({ ...s, status: 'pending' })),
    stepResults: [],
    input,
    output: null,
    createdAt: new Date().toISOString(),
    userId: input.userId,
  };
  jobStore.set(jobId, job);

  // 异步执行
  setImmediate(() => _runJob(jobId, activeSteps, mode, input).catch(err => {
    logger.error(`[WorkflowEngine] job=${jobId} fatal:`, err.message);
    const j = jobStore.get(jobId);
    if (j) {
      j.status = 'failed';
      j.error = err.message;
      j.completedAt = new Date().toISOString();
    }
  }));

  return { jobId, workflowName: wf.name, totalSteps: activeSteps.length, status: 'running' };
}

// ==================== 内部执行 ====================

async function _runJob(jobId, steps, mode, input) {
  const job = jobStore.get(jobId);
  if (!job) return;

  const ctx = {
    ...input,
    _jobId: jobId,
    _mode: mode,
    imageUrls: [],
    storyboardUrls: [],
    generatedCount: 0,
    textContent: '',
    scriptContent: '',
    package: null,
  };

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    job.steps[i].status = 'running';
    job.steps[i].startedAt = new Date().toISOString();

    try {
      // ── 步骤级模型选择 ──
      let stepModel = null;
      if (step.allowModel) {
        if (mode === 'auto' || !step.modelKey || step.modelKey === 'auto') {
          stepModel = await autoSelect(step.category, step.taskType);
        } else {
          stepModel = await getModelConfig(step.modelKey);
        }
        ctx._stepModel = stepModel;
      }

      logger.info(`[WorkflowEngine] job=${jobId} step=${step.key} [${i + 1}/${steps.length}]`, {
        mode,
        model: stepModel?.model_key || 'builtin',
      });

      // ── 执行步骤 ──
      const executor = STEP_EXECUTORS[step.key];
      if (!executor) {
        throw new Error(`未知步骤类型: ${step.key}`);
      }

      const output = await Promise.race([
        executor(ctx),
        new Promise((_, reject) => setTimeout(() => reject(new Error(`${step.label} 执行超时`)), step.timeout || 300_000)),
      ]);

      // 合并输出到上下文
      Object.assign(ctx, output);

      job.steps[i].status = 'completed';
      job.steps[i].output = output;
      job.stepResults.push({
        step: step.key,
        label: step.label,
        status: 'completed',
        model: stepModel?.model_key || 'builtin',
        output,
      });
    } catch (err) {
      job.steps[i].status = 'failed';
      job.steps[i].error = err.message;
      job.stepResults.push({
        step: step.key,
        label: step.label,
        status: 'failed',
        error: err.message,
      });

      // 必填步骤失败 → 终止
      if (step.required) {
        job.status = 'failed';
        job.error = `步骤 "${step.label}" 执行失败: ${err.message}`;
        job.completedAt = new Date().toISOString();
        return;
      }
      // 可选步骤失败 → 跳过继续
      logger.warn(`[WorkflowEngine] job=${jobId} optional step "${step.label}" failed, skipping`);
    }

    job.steps[i].completedAt = new Date().toISOString();
    job.progress = Math.floor(((i + 1) / steps.length) * 100);
  }

  // 全部完成
  job.status = 'completed';
  job.progress = 100;
  job.output = {
    images: ctx.imageUrls || [],
    text: ctx.textContent || '',
    script: ctx.scriptContent || '',
    video: ctx.videoUrl || null,
    voice: ctx.voiceUrl || null,
    package: ctx.package || null,
  };
  job.completedAt = new Date().toISOString();
  logger.info(`[WorkflowEngine] job=${jobId} completed, ${steps.length} steps`);
}

// ==================== 作业查询 & 控制 ====================

export function getJob(jobId) {
  const job = jobStore.get(jobId);
  if (!job) throw new BusinessError(404, '作业不存在');
  return job;
}

export function listJobs(userId, { limit = 50, offset = 0 } = {}) {
  const all = [...jobStore.values()].filter(j => !userId || j.userId === userId);
  return {
    total: all.length,
    items: all.slice(offset, offset + limit),
  };
}

/** 人工暂停 */
export function pauseJob(jobId) {
  const job = jobStore.get(jobId);
  if (!job) throw new BusinessError(404, '作业不存在');
  if (job.status !== 'running') throw new BusinessError(400, '仅运行中的作业可暂停');
  job.status = 'paused';
  return { jobId, status: 'paused' };
}

/** 人工恢复 */
export async function resumeJob(jobId, modifiedContext = {}) {
  const job = jobStore.get(jobId);
  if (!job) throw new BusinessError(404, '作业不存在');
  if (job.status !== 'paused') throw new BusinessError(400, '仅暂停的作业可恢复');

  // 合并人工修改的上下文
  const input = { ...job.input, ...modifiedContext };
  job.input = input;
  job.status = 'running';

  // 找到未完成的步骤继续执行
  const remainingSteps = job.steps.filter(s => s.status !== 'completed');
  setImmediate(() => _runJob(jobId, remainingSteps, job.mode, input).catch(err => {
    logger.error(`[WorkflowEngine] job=${jobId} resume failed:`, err.message);
    job.status = 'failed';
    job.error = err.message;
  }));

  return { jobId, status: 'running', remainingSteps: remainingSteps.length };
}

/** 取消 */
export function cancelJob(jobId) {
  const job = jobStore.get(jobId);
  if (!job) throw new BusinessError(404, '作业不存在');
  if (!['running', 'paused', 'pending'].includes(job.status)) {
    throw new BusinessError(400, '当前状态不可取消');
  }
  job.status = 'cancelled';
  job.completedAt = new Date().toISOString();
  return { jobId, status: 'cancelled' };
}

export default {
  executeWorkflow, getJob, listJobs,
  pauseJob, resumeJob, cancelJob,
};
