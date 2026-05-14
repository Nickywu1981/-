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
import { autoSelect, getModelConfig, checkQuota, consumeQuota } from './modelPoolService.js';
import { recordFeedback } from './feedbackLearningService.js';
import logger from '../utils/logger.js';
import { BusinessError } from '../utils/businessError.js';
import { WorkingMemory } from './workingMemory.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { STEP_EXECUTORS } from './stepExecutors.js';

// ==================== 作业存储(内存+后续迁移Redis) ====================
const jobStore = new Map();

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
  const { workflowId, mode = 'auto', input = {}, overrides: reqOverrides = {} } = params;

  // 验证工作流
  const wf = getWorkflow(workflowId);
  if (!wf) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND, `Workflow not found: ${workflowId}`);

  // 从数据库加载已保存的配置(请求覆盖优先)
  let overrides = { ...reqOverrides };
  if (input.userId) {
    try {
      const { getWorkflowConfig } = await import('../dao/workflowConfigDao.js');
      const dbConfig = await getWorkflowConfig(workflowId, input.userId);
      if (dbConfig) {
        overrides = {
          disabledSteps: reqOverrides.disabledSteps || dbConfig.disabled_steps || [],
          modelBindings: reqOverrides.modelBindings || dbConfig.model_bindings || {},
          extraSteps: reqOverrides.extraSteps || dbConfig.extra_steps || [],
          deletedSteps: reqOverrides.deletedSteps || dbConfig.deleted_steps || [],
          stepOrder: reqOverrides.stepOrder || dbConfig.step_order || [],
        };
        if (dbConfig.mode && mode === 'auto') overrides._dbMode = dbConfig.mode;
      }
    } catch (e) {
      logger.warn(`[WorkflowEngine] failed to load DB config: ${e.message}`);
    }
  }

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
      throw new BusinessError(ERROR_CODE.PARAM_ERROR);
    }
  }

  // ── deletedSteps 约束：必填步骤不可删除 ──
  if (overrides.deletedSteps?.length) {
    const requiredKeys = new Set(wf.steps.filter(s => s.required).map(s => s.key));
    const deletedRequired = overrides.deletedSteps.filter(k => requiredKeys.has(k));
    if (deletedRequired.length > 0) {
      throw new BusinessError(ERROR_CODE.PARAM_ERROR, `Required steps cannot be deleted: ${deletedRequired.join(", ")}`);
    }
  }

  // ── stepOrder 校验：未知key拒绝 ──
  if (overrides.stepOrder?.length) {
    const validKeys = new Set(steps.map(s => s.key));
    const invalidKeys = overrides.stepOrder.filter(k => !validKeys.has(k));
    if (invalidKeys.length > 0) {
      throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND, `stepOrder contains unknown steps: ${invalidKeys.join(", ")}`);
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

  const wm = new WorkingMemory();

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
        // 配额检查
        const quotaResult = await checkQuota(stepModel.model_key, input.userId);
        if (!quotaResult.allowed) {
          throw new BusinessError(ERROR_CODE.QUOTA_EXCEEDED, quotaResult.reason || 'Model quota exhausted');
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
        throw new BusinessError(ERROR_CODE.PARAM_ERROR, `Unknown step type: ${step.key}`);
      }

      const output = await Promise.race([
        executor(ctx),
        new Promise((_, reject) => setTimeout(() => reject(new BusinessError(ERROR_CODE.AI_TIMEOUT, `${step.label} execution timeout`)), step.timeout || 300_000)),
      ]);

      // 合并输出到上下文
      Object.assign(ctx, output);

      // 配额消耗
      if (stepModel) {
        consumeQuota(stepModel.model_key, input.userId);
      }

      job.steps[i].status = 'completed';
      job.steps[i].output = output;
      job.stepResults.push({
        step: step.key,
        label: step.label,
        status: 'completed',
        model: stepModel?.model_key || 'builtin',
        output,
      });

      // 工作记忆: 记录步骤执行结果
      wm.set(`step_${step.key}`, { status: 'completed', model: stepModel?.model_key, ts: Date.now() }, 1);
    } catch (err) {
      job.steps[i].status = 'failed';
      job.steps[i].error = err.message;
      job.stepResults.push({
        step: step.key,
        label: step.label,
        status: 'failed',
        error: err.message,
      });

      // 工作记忆: 记录失败
      wm.set(`step_${step.key}`, { status: 'failed', error: err.message, ts: Date.now() }, 2);

      // 必填步骤失败 → 终止
      if (step.required) {
        job.status = 'failed';
        job.error = `步骤 "${step.label}" 执行失败: ${err.message}`;
        job.completedAt = new Date().toISOString();
        wm.flushToLTM(input.userId).catch(e => logger.warn('[WorkflowEngine] Working memory flush failed', { error: e.message }));
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

  // 工作记忆: 记录产品信息并刷新到 LTM
  if (input.productName) wm.set('product', input.productName, 1);
  wm.set('job_result', { status: 'completed', outputKeys: Object.keys(job.output) }, 2);
  wm.flushToLTM(input.userId).catch(e => logger.warn('[WorkflowEngine] Working memory flush failed', { error: e.message }));

  // 反馈学习: 记录每个模型的表现
  const usedModels = [...new Set(job.stepResults.map(r => r.model).filter(m => m && m !== 'builtin'))];
  for (const modelKey of usedModels) {
    recordFeedback({
      jobId, modelKey, userId: input.userId, output: job.output,
      taskType: input.workflowType || input.taskType,
      input,
    }).catch(e => logger.warn('[WorkflowEngine] Feedback record failed', { modelKey, error: e.message }));
  }

  logger.info(`[WorkflowEngine] job=${jobId} completed, ${steps.length} steps`);
}

// ==================== 作业查询 & 控制 ====================

export function getJob(jobId) {
  const job = jobStore.get(jobId);
  if (!job) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
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
  if (!job) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  if (job.status !== 'running') throw new BusinessError(ERROR_CODE.PARAM_ERROR);
  job.status = 'paused';
  return { jobId, status: 'paused' };
}

/** 人工恢复 */
export async function resumeJob(jobId, modifiedContext = {}) {
  const job = jobStore.get(jobId);
  if (!job) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  if (job.status !== 'paused') throw new BusinessError(ERROR_CODE.PARAM_ERROR);

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
  if (!job) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  if (!['running', 'paused', 'pending'].includes(job.status)) {
    throw new BusinessError(ERROR_CODE.PARAM_ERROR);
  }
  job.status = 'cancelled';
  job.completedAt = new Date().toISOString();
  return { jobId, status: 'cancelled' };
}

export default {
  executeWorkflow, getJob, listJobs,
  pauseJob, resumeJob, cancelJob,
};
