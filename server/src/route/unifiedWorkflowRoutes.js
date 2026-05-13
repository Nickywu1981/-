/**
 * 统一工作流 + 模型池 路由
 *
 * /api/workflow/*  — 工作流执行+配置
 * /api/admin/model-pool/* — 模型池管理
 */
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { adminLimiter, heavyLimiter } from '../middleware/rateLimiter.js';
import * as ctrl from '../controller/unifiedWorkflowController.js';

const router = Router();

// ==================== 工作流执行 ====================

// POST /api/workflow/execute — 执行工作流（双模式支持）
router.post('/execute', authMiddleware, heavyLimiter, ctrl.executeWorkflow);

// GET /api/workflow/jobs — 我的作业列表
router.get('/jobs', authMiddleware, ctrl.listJobs);

// GET /api/workflow/job/:id — 作业详情/进度
router.get('/job/:id', authMiddleware, ctrl.getJob);

// POST /api/workflow/job/:id/pause — 人工暂停
router.post('/job/:id/pause', authMiddleware, ctrl.pauseJob);

// POST /api/workflow/job/:id/resume — 人工恢复(可提交修改的上下文)
router.post('/job/:id/resume', authMiddleware, ctrl.resumeJob);

// POST /api/workflow/job/:id/cancel — 取消
router.post('/job/:id/cancel', authMiddleware, ctrl.cancelJob);

// ==================== 工作流配置 ====================

// GET /api/workflow/definitions — 7条工作流定义列表
router.get('/definitions', authMiddleware, ctrl.getDefinitions);

// GET /api/workflow/definition/:id — 单条工作流详情
router.get('/definition/:id', authMiddleware, ctrl.getDefinition);

// GET /api/workflow/definition/:id/steps — 可绑定模型的步骤
router.get('/definition/:id/steps', authMiddleware, ctrl.getBindableSteps_);

// PUT /api/workflow/definition/:id/config — 配置工作流(步骤开关/模型绑定/增删节点)
router.put('/definition/:id/config', authMiddleware, requireRole('admin'), ctrl.configureWorkflow);

// GET /api/workflow/definition/:id/config — 读取已保存的工作流配置
router.get('/definition/:id/config', authMiddleware, ctrl.getWorkflowConfig);

// GET /api/workflow/config-options — 可自定义配置清单
router.get('/config-options', authMiddleware, ctrl.getConfigOptions);

// ==================== 模型池管理 (Admin) ====================

// GET /api/admin/model-pool — 模型池全量
router.get('/admin/model-pool', authMiddleware, requireRole('admin'), ctrl.getModelPool);

// GET /api/admin/model-pool/stats — 模型池统计
router.get('/admin/model-pool/stats', authMiddleware, requireRole('admin'), ctrl.getPoolStats);

// GET /api/admin/model-pool/category/:category — 按类别查询
router.get('/admin/model-pool/category/:category', authMiddleware, ctrl.getByCategory);

// POST /api/admin/model-pool — 注册新模型
router.post('/admin/model-pool', adminLimiter, authMiddleware, requireRole('admin'), ctrl.registerModel);

// PUT /api/admin/model-pool/:key — 更新模型
router.put('/admin/model-pool/:key', adminLimiter, authMiddleware, requireRole('admin'), ctrl.updateModel);

// DELETE /api/admin/model-pool/:key — 删除模型
router.delete('/admin/model-pool/:key', adminLimiter, authMiddleware, requireRole('admin'), ctrl.removeModel);

// PATCH /api/admin/model-pool/:key/toggle — 启停模型
router.patch('/admin/model-pool/:key/toggle', adminLimiter, authMiddleware, requireRole('admin'), ctrl.toggleModel);

// PUT /api/admin/model-pool/:key/gray — 灰度百分比
router.put('/admin/model-pool/:key/gray', adminLimiter, authMiddleware, requireRole('admin'), ctrl.setGrayPercent);

export default router;
