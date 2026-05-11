import { Router } from 'express';
import { z } from 'zod';
import {
  submitBatchTask, redoBatchTask, listBatchHistory, getBatchZipUrl, getTaskResult,
  saveBatchTemplate, listBatchTemplates, deleteBatchTemplate,
} from '../controller/batchController.js';
import { authMiddleware } from '../middleware/auth.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import { tierGuard } from '../middleware/tierGuard.js';
import { validate, paginationSchema, idParamSchema, numericParamSchema } from '../utils/validate.js';

const router = Router();

const taskIdParamSchema = numericParamSchema('taskId');

const submitSchema = z.object({
  imageUrls: z.array(z.string().url()).min(1, '至少需要1张图片').max(100, '最多100张图片'),
  operation: z.string().min(1, '请选择操作类型'),
  platform: z.string().optional(),
  style: z.string().optional(),
  nightMode: z.coerce.boolean().optional(),
});

const redoSchema = z.object({
  taskId: z.string().min(1),
});

const templateSchema = z.object({
  name: z.string().min(1, '模板名称不能为空').max(60),
  operation: z.string().min(1, '请选择操作类型'),
  platform: z.string().optional(),
  style: z.string().optional(),
  nightMode: z.coerce.boolean().optional(),
  imageCount: z.coerce.number().int().positive().optional(),
});

// 批量任务
router.post('/submit', authMiddleware, heavyLimiter, tierGuard('image'), validate(submitSchema), submitBatchTask);
router.post('/redo', authMiddleware, heavyLimiter, tierGuard('image'), validate(redoSchema), redoBatchTask);
router.get('/history', authMiddleware, validate(paginationSchema, 'query'), listBatchHistory);
router.get('/tasks/:taskId', authMiddleware, validate(taskIdParamSchema, 'params'), getTaskResult);
router.get('/:taskId/download', authMiddleware, validate(taskIdParamSchema, 'params'), getBatchZipUrl);

// 批量模板
router.post('/templates', authMiddleware, heavyLimiter, validate(templateSchema), saveBatchTemplate);
router.get('/templates', authMiddleware, validate(paginationSchema, 'query'), listBatchTemplates);
router.delete('/templates/:id', authMiddleware, heavyLimiter, validate(idParamSchema, 'params'), deleteBatchTemplate);

export default router;
