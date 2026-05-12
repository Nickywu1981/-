/**
 * Movio AI v4.1 — Internal Test Workbench API
 * G5 后端开发 | 内部测试台专用
 *
 * 端点:
 *   GET  /api/test/models          — 可用模型列表（按类别分组 + 状态）
 *   POST /api/test/single          — 单模型测试
 *   POST /api/test/mixed           — 自动混合模型测试
 *   POST /api/test/custom          — 自定义多模型编排测试
 *   POST /api/test/compare         — 多模型并行对比
 *   GET  /api/test/history         — 测试历史记录
 *   DELETE /api/test/history/:id   — 删除单条历史
 *   DELETE /api/test/history       — 清空历史
 */
import { Router } from 'express';
import { z } from 'zod';
import { validateV4 as _validate, validate, idParamSchema } from '../utils/validate.js';
import { requireRole } from '../middleware/rbac.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import * as ctrl from '../controller/v4TestWorkbenchController.js';

const router = Router();

// ---- Zod Schemas ----
const singleTestSchema = z.object({
  model_key: z.string().min(1).max(50),
  prompt: z.string().min(1, '请输入提示词').max(5000),
  category: z.enum(['text', 'image', 'video']),
  params: z.record(z.unknown()).optional().default({}),
});

const mixedTestSchema = z.object({
  task_type: z.string().min(1).max(50),
  prompt: z.string().min(1, '请输入提示词').max(5000),
  category: z.enum(['text', 'image', 'video']),
  params: z.record(z.unknown()).optional().default({}),
});

const customTestSchema = z.object({
  task_type: z.string().min(1).max(50),
  prompt: z.string().min(1, '请输入提示词').max(5000),
  category: z.enum(['text', 'image', 'video']),
  model_sequence: z.array(z.string().min(1)).min(1, '至少选择一个模型'),
  parallel: z.boolean().optional().default(false),
  params: z.record(z.unknown()).optional().default({}),
});

const compareTestSchema = z.object({
  prompt: z.string().min(1, '请输入提示词').max(5000),
  category: z.enum(['text', 'image', 'video']),
  model_keys: z.array(z.string().min(1)).min(2, '对比至少需要2个模型'),
  params: z.record(z.unknown()).optional().default({}),
});

// GET /api/test/models
router.get('/models', requireRole('admin'), (req, res) => ctrl.getModels(req, res));

// POST /api/test/single — 单模型独立测试
router.post('/single', requireRole('admin'), heavyLimiter, _validate(singleTestSchema), (req, res) => ctrl.testSingle(req, res));

// POST /api/test/mixed — 自动混合模型调用
router.post('/mixed', requireRole('admin'), heavyLimiter, _validate(mixedTestSchema), (req, res) => ctrl.testMixed(req, res));

// POST /api/test/custom — 自定义多模型编排测试
router.post('/custom', requireRole('admin'), heavyLimiter, _validate(customTestSchema), (req, res) => ctrl.testCustom(req, res));

// POST /api/test/compare — 多模型并行对比
router.post('/compare', requireRole('admin'), heavyLimiter, _validate(compareTestSchema), (req, res) => ctrl.testCompare(req, res));

// GET /api/test/history
router.get('/history', requireRole('admin'), (req, res) => ctrl.getHistory(req, res));

// DELETE /api/test/history/:id
router.delete('/history/:id', requireRole('admin'), validate(idParamSchema, 'params'), (req, res) => ctrl.deleteHistory(req, res));

// DELETE /api/test/history — 清空全部
router.delete('/history', requireRole('admin'), (req, res) => ctrl.clearHistory(req, res));

export default router;
