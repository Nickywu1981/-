/**
 * 统一工作流引擎 + 模型池 管理控制器
 */
import * as engine from '../services/unifiedWorkflowEngine.js';
import * as pool from '../services/modelPoolService.js';
import { listWorkflows, getWorkflow, getBindableSteps } from '../services/workflowDefinitions.js';
import * as wfConfigDao from '../dao/workflowConfigDao.js';
import { wrapController } from '../utils/wrapController.js';
import { BusinessError } from '../utils/businessError.js';
import logger from '../utils/logger.js';
import { INDUSTRY_LIST } from '../services/industryConfig.js';
import { ERROR_CODE } from '../constants/errorCode.js';

// ==================== 工作流执行 ====================

export const executeWorkflow = wrapController(async (req) => {
  const { workflowId, mode, input, overrides } = req.body;
  return engine.executeWorkflow({
    workflowId,
    mode: mode || 'auto',
    input: { ...input, userId: req.user?.id, ip: req.ip },
    overrides: overrides || {},
  });
});

export const listJobs = wrapController(async (req) => {
  const { limit, offset } = req.query;
  return engine.listJobs(req.user?.id, {
    limit: parseInt(limit) || 50,
    offset: parseInt(offset) || 0,
  });
});

export const getJob = wrapController(async (req) => {
  return engine.getJob(req.params.id);
});

export const pauseJob = wrapController(async (req) => {
  return engine.pauseJob(req.params.id);
});

export const resumeJob = wrapController(async (req) => {
  const { modifiedContext } = req.body || {};
  return engine.resumeJob(req.params.id, modifiedContext);
});

export const cancelJob = wrapController(async (req) => {
  return engine.cancelJob(req.params.id);
});

// ==================== 工作流配置 ====================

export const getDefinitions = wrapController(async () => {
  return listWorkflows();
});

export const getDefinition = wrapController(async (req) => {
  const wf = getWorkflow(req.params.id);
  if (!wf) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  return wf;
});

export const getBindableSteps_ = wrapController(async (req) => {
  const steps = getBindableSteps(req.params.id);
  if (!steps.length) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  return steps;
});

export const configureWorkflow = wrapController(async (req) => {
  const { disabledSteps, modelBindings, extraSteps, deletedSteps, stepOrder, params, mode } = req.body || {};
  const config = {
    workflowId: req.params.id,
    disabledSteps: disabledSteps || [],
    modelBindings: modelBindings || {},
    extraSteps: extraSteps || [],
    deletedSteps: deletedSteps || [],
    stepOrder: stepOrder || [],
    params: params || {},
    mode: mode || 'auto',
  };
  const saved = await wfConfigDao.upsertWorkflowConfig(req.params.id, req.user?.id, config);
  logger.info('[WorkflowConfig] Persisted', { workflowId: req.params.id, userId: req.user?.id });
  return saved || config;
});

export const getWorkflowConfig = wrapController(async (req) => {
  const wf = getWorkflow(req.params.id);
  if (!wf) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  return wfConfigDao.getWorkflowConfig(req.params.id, req.user?.id);
});

// ==================== 模型池管理 ====================

export const getModelPool = wrapController(async () => {
  return pool.getPool();
});

export const getPoolStats = wrapController(async () => {
  return pool.getPoolStats();
});

export const getByCategory = wrapController(async (req) => {
  return pool.listEnabledByCategory(req.params.category);
});

export const setGrayPercent = wrapController(async (req) => {
  return pool.setGrayPercent(req.params.key, req.body.percent);
});

export const registerModel = wrapController(async (req) => {
  return pool.registerModel(req.body);
});

export const updateModel = wrapController(async (req) => {
  return pool.updateModel(req.params.key, req.body);
});

export const removeModel = wrapController(async (req) => {
  await pool.removeModel(req.params.key);
  return { removed: req.params.key };
});

export const toggleModel = wrapController(async (req) => {
  return pool.toggleModel(req.params.key, req.body.enabled);
});

export const getAbStats = wrapController(async (req) => {
  const { days } = req.query;
  return pool.getAbStats(parseInt(days) || 7);
});

// ==================== 可配置清单 ====================

export const getConfigOptions = wrapController(async () => {
  const [poolStats, workflows] = await Promise.all([
    pool.getPoolStats(),
    listWorkflows(),
  ]);
  return {
    modelPool: poolStats,
    workflows,
    options: {
      industries: INDUSTRY_LIST,
      platforms: [
        { key: 'taobao', label: '淘宝/天猫' },
        { key: 'douyin', label: '抖音' },
        { key: 'jd', label: '京东' },
        { key: 'kuaishou', label: '快手' },
      ],
      styles: [
        { key: 'professional', label: '专业商务' },
        { key: 'minimalist', label: '极简风' },
        { key: 'lifestyle', label: '生活方式' },
        { key: 'trendy', label: '潮流时尚' },
      ],
      videoDuration: [15, 30, 60],
      storyboardCount: [5, 6, 7, 8],
      modes: [
        { key: 'auto', label: '智能自动 — 系统自动选最优模型' },
        { key: 'custom', label: '自定义 — 手动指定每步模型和参数' },
      ],
    },
  };
});
