/**
 * A/B 实验路由
 * /api/admin/experiments
 */
import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { adminLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../utils/validate.js';
import * as ctrl from '../controller/abTestController.js';

const router = Router();

const variantSchema = z.object({
  variantId: z.string().min(1),
  modelKey: z.string().optional(),
  templateId: z.string().optional(),
  weight: z.number().min(1).max(100).optional().default(50),
  description: z.string().max(128).optional().default(''),
});

const metricSchema = z.object({
  metricId: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['conversion', 'quality', 'latency']),
  aggregation: z.enum(['avg', 'sum', 'rate']).optional().default('avg'),
});

const createSchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string().max(512).optional(),
  variants: z.array(variantSchema).min(2),
  metrics: z.array(metricSchema).min(1),
  targetType: z.enum(['model', 'template', 'prompt', 'full_workflow']).optional().default('model'),
});

const updateSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  description: z.string().max(512).optional(),
  variants: z.array(variantSchema).min(2).optional(),
  metrics: z.array(metricSchema).min(1).optional(),
  targetType: z.enum(['model', 'template', 'prompt', 'full_workflow']).optional(),
});

// 所有路由需管理员权限
router.use(authMiddleware, requireRole('admin'));

// GET /api/admin/experiments — 实验列表
router.get('/', ctrl.listExperiments);

// POST /api/admin/experiments — 创建
router.post('/', adminLimiter, validate(createSchema), ctrl.createExperiment);

// GET /api/admin/experiments/:id — 详情
router.get('/:id(\\d+)', ctrl.getExperiment);

// PUT /api/admin/experiments/:id — 更新
router.put('/:id(\\d+)', adminLimiter, validate(updateSchema), ctrl.updateExperiment);

// DELETE /api/admin/experiments/:id — 删除
router.delete('/:id(\\d+)', adminLimiter, ctrl.deleteExperiment);

// POST /api/admin/experiments/:id/start — 启动
router.post('/:id(\\d+)/start', adminLimiter, ctrl.startExperiment);

// POST /api/admin/experiments/:id/pause — 暂停
router.post('/:id(\\d+)/pause', adminLimiter, ctrl.pauseExperiment);

// POST /api/admin/experiments/:id/complete — 完成
router.post('/:id(\\d+)/complete', adminLimiter, ctrl.completeExperiment);

// GET /api/admin/experiments/:id/results — 结果+显著性
router.get('/:id(\\d+)/results', ctrl.getResults);

export default router;
