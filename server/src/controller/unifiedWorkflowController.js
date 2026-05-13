/**
 * 统一工作流引擎 + 模型池 管理控制器
 *
 * API 端点:
 *   工作流执行:
 *     POST /api/workflow/execute       — 执行工作流
 *     GET  /api/workflow/jobs           — 作业列表
 *     GET  /api/workflow/job/:id        — 作业详情/进度
 *     POST /api/workflow/job/:id/pause  — 人工暂停
 *     POST /api/workflow/job/:id/resume — 人工恢复(可提交修改)
 *     POST /api/workflow/job/:id/cancel — 取消
 *
 *   工作流配置:
 *     GET  /api/workflow/definitions             — 7条工作流定义列表
 *     GET  /api/workflow/definition/:id           — 单条工作流详情
 *     GET  /api/workflow/definition/:id/steps     — 可绑定模型的步骤列表
 *     PUT  /api/workflow/definition/:id/config    — 配置工作流(步骤开关/模型绑定)
 *
 *   模型池管理:
 *     GET    /api/admin/model-pool               — 模型池状态
 *     GET    /api/admin/model-pool/stats          — 模型池统计
 *     GET    /api/admin/model-pool/category/:cat  — 按类别查询
 *     PUT    /api/admin/model-pool/:key/gray      — 设置灰度百分比
 */
import * as engine from '../services/unifiedWorkflowEngine.js';
import * as pool from '../services/modelPoolService.js';
import { listWorkflows, getWorkflow, getBindableSteps } from '../services/workflowDefinitions.js';
import logger from '../utils/logger.js';

// ==================== 工作流执行 ====================

export async function executeWorkflow(req, res) {
  const { workflowId, mode, input, overrides } = req.body;
  const result = await engine.executeWorkflow({
    workflowId,
    mode: mode || 'auto',
    input: {
      ...input,
      userId: req.user?.id,
      ip: req.ip,
    },
    overrides: overrides || {},
  });
  res.json({ success: true, data: result });
}

export async function listJobs(req, res) {
  const { limit, offset } = req.query;
  const result = engine.listJobs(req.user?.id, {
    limit: parseInt(limit) || 50,
    offset: parseInt(offset) || 0,
  });
  res.json({ success: true, data: result });
}

export async function getJob(req, res) {
  const result = engine.getJob(req.params.id);
  res.json({ success: true, data: result });
}

export async function pauseJob(req, res) {
  const result = engine.pauseJob(req.params.id);
  res.json({ success: true, data: result });
}

export async function resumeJob(req, res) {
  const { modifiedContext } = req.body || {};
  const result = await engine.resumeJob(req.params.id, modifiedContext);
  res.json({ success: true, data: result });
}

export async function cancelJob(req, res) {
  const result = engine.cancelJob(req.params.id);
  res.json({ success: true, data: result });
}

// ==================== 工作流配置 ====================

export async function getDefinitions(req, res) {
  const workflows = listWorkflows();
  res.json({ success: true, data: workflows });
}

export async function getDefinition(req, res) {
  const wf = getWorkflow(req.params.id);
  if (!wf) return res.status(404).json({ success: false, message: '工作流不存在' });
  res.json({ success: true, data: wf });
}

export async function getBindableSteps_(req, res) {
  const steps = getBindableSteps(req.params.id);
  if (!steps.length) return res.status(404).json({ success: false, message: '工作流不存在或无绑定步骤' });
  res.json({ success: true, data: steps });
}

export async function configureWorkflow(req, res) {
  const { disabledSteps, modelBindings, extraSteps } = req.body || {};

  // 存储配置到数据库 (TODO: 持久化到 workflow_config 表)
  const config = {
    workflowId: req.params.id,
    disabledSteps: disabledSteps || [],
    modelBindings: modelBindings || {},
    extraSteps: extraSteps || [],
    updatedAt: new Date().toISOString(),
  };

  logger.info('[WorkflowConfig] Updated', config);

  res.json({ success: true, data: config });
}

// ==================== 模型池管理 ====================

export async function getModelPool(req, res) {
  const poolData = await pool.getPool();
  res.json({ success: true, data: poolData });
}

export async function getPoolStats(req, res) {
  const stats = await pool.getPoolStats();
  res.json({ success: true, data: stats });
}

export async function getByCategory(req, res) {
  const models = await pool.listEnabledByCategory(req.params.category);
  res.json({ success: true, data: models });
}

export async function setGrayPercent(req, res) {
  const { percent } = req.body;
  if (typeof percent !== 'number' || percent < 0 || percent > 100) {
    return res.status(400).json({ success: false, message: '灰度百分比需在 0-100 之间' });
  }
  const result = await pool.setGrayPercent(req.params.key, percent);
  res.json({ success: true, data: result });
}

// ==================== 可配置清单 ====================

export async function getConfigOptions(req, res) {
  const [poolStats, workflows] = await Promise.all([
    pool.getPoolStats(),
    listWorkflows(),
  ]);

  res.json({
    success: true,
    data: {
      modelPool: poolStats,
      workflows,
      options: {
        industries: [
          { key: 'clothing', label: '服装' },
          { key: 'beauty', label: '美妆' },
          { key: '3c_digital', label: '3C数码' },
          { key: 'food', label: '食品' },
          { key: 'home', label: '家居' },
        ],
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
    },
  });
}
