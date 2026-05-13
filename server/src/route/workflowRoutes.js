/**
 * 工作流 — Routes
 * GET    /api/workflows/templates        — 模板列表
 * GET    /api/workflows/templates/:id    — 模板详情
 * POST   /api/workflows/templates        — 创建模板
 * PUT    /api/workflows/templates/:id    — 更新模板
 * DELETE /api/workflows/templates/:id    — 删除模板
 * POST   /api/workflows/execute          — 执行工作流
 * GET    /api/workflows/jobs             — 我的作业列表
 * GET    /api/workflows/jobs/:id         — 作业详情
 * POST   /api/workflows/jobs/:id/cancel  — 取消作业
 */
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../utils/validate.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import * as ctrl from '../controller/workflowController.js';

const router = Router();

const templateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  steps: z.array(z.object({
    type: z.enum(['generate_text', 'generate_image', 'generate_voice', 'generate_video', 'export']),
    label: z.string().min(1).max(50),
    inputs: z.array(z.string()).optional(),
    outputs: z.array(z.string()).optional(),
  })).min(1).max(20),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

const executeSchema = z.object({
  templateId: z.number().int().positive(),
  inputData: z.record(z.any()).optional(),
});

router.get('/templates', ctrl.listTemplates);
router.get('/templates/:id', ctrl.getTemplate);
router.post('/templates', validate(templateSchema), ctrl.createTemplate);
router.put('/templates/:id', validate(templateSchema.partial()), ctrl.updateTemplate);
router.delete('/templates/:id', ctrl.deleteTemplate);
router.post('/execute', validate(executeSchema), ctrl.execute);
router.get('/jobs', ctrl.listMyJobs);
router.get('/jobs/:id', ctrl.getJob);
router.post('/jobs/:id/cancel', ctrl.cancelJob);

export default router;
