import { Router } from 'express';
import { z } from 'zod';
import {
  submitBatchTask, redoBatchTask, listBatchHistory, getBatchZipUrl, getTaskResult,
  saveBatchTemplate, listBatchTemplates, deleteBatchTemplate,
} from '../controller/batchController.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import { tierGuard } from '../middleware/tierGuard.js';
import { validate, idSchema, paginationSchema } from '../utils/validate.js';

const router = Router();

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
  settings: z.object({}).passthrough(),
});

// 批量任务
router.post('/submit', authMiddleware, heavyLimiter, tierGuard('image'), validate(submitSchema), asyncHandler(submitBatchTask));
router.post('/redo', authMiddleware, heavyLimiter, tierGuard('image'), validate(redoSchema), asyncHandler(redoBatchTask));
router.get('/history', authMiddleware, validate(paginationSchema, 'query'), asyncHandler(listBatchHistory));
router.get('/tasks/:taskId', authMiddleware, asyncHandler(getTaskResult));
router.get('/:taskId/download', authMiddleware, asyncHandler(getBatchZipUrl));

// 批量模板
router.post('/templates', authMiddleware, validate(templateSchema), asyncHandler(saveBatchTemplate));
router.get('/templates', authMiddleware, validate(paginationSchema, 'query'), asyncHandler(listBatchTemplates));
router.delete('/templates/:id', authMiddleware, validate(idSchema, 'params'), asyncHandler(deleteBatchTemplate));

export default router;
