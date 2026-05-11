import { Router } from 'express';
import {
  submitMainImage, submitSceneImage, submitDetailH5,
  submitBatchTask, submitRetouch, submitRemoveBg, submitWhiteBg,
  getTaskResult, listMyTasks, cancelTask, retryTask,
} from '../controller/imageController.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import { tierGuard } from '../middleware/tierGuard.js';
import { validate, paginationSchema } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const taskIdParamSchema = z.object({ taskId: z.string().regex(/^\d+$/).transform(Number) });

const imageUrlSchema = z.string().url('请提供有效的图片URL').min(1);
const platformSchema = z.string().min(1, '请选择平台');

const mainImageSchema = z.object({
  imageUrl: imageUrlSchema,
  platform: platformSchema,
  style: z.string().optional(),
});
const sceneImageSchema = z.object({
  imageUrl: imageUrlSchema,
  sceneCategory: z.string().optional(),
  customBgUrl: z.string().url().optional().or(z.literal('')),
});
const detailH5Schema = z.object({
  imageUrl: imageUrlSchema,
  category: z.string().min(1, '请选择商品类目'),
  templateId: z.coerce.number().int().optional(),
  platform: platformSchema.optional(),
  skuCount: z.coerce.number().int().min(1).optional(),
});
const batchTaskSchema = z.object({
  imageUrls: z.array(z.string().url()).min(1, '至少需要一张图片').max(500, '单次最多500张'),
  operation: z.string().min(1, '请选择操作类型'),
  platform: platformSchema.optional(),
  style: z.string().optional(),
});
const retouchSchema = z.object({
  imageUrl: imageUrlSchema,
  level: z.enum(['standard', 'high', 'ultra']).optional(),
  features: z.array(z.string()).optional(),
});
const removeBgSchema = z.object({
  imageUrl: imageUrlSchema,
  format: z.enum(['png', 'webp', 'jpg']).optional(),
});
const whiteBgSchema = z.object({
  imageUrl: imageUrlSchema,
  bgColor: z.string().optional(),
});

// 所有图片任务需要登录
router.post('/main-image', authMiddleware, heavyLimiter, tierGuard('image'), validate(mainImageSchema), asyncHandler(submitMainImage));
router.post('/scene', authMiddleware, heavyLimiter, tierGuard('image'), validate(sceneImageSchema), asyncHandler(submitSceneImage));
router.post('/detail-h5', authMiddleware, heavyLimiter, tierGuard('image'), validate(detailH5Schema), asyncHandler(submitDetailH5));
router.post('/batch', authMiddleware, heavyLimiter, tierGuard('image'), validate(batchTaskSchema), asyncHandler(submitBatchTask));
router.post('/retouch', authMiddleware, heavyLimiter, tierGuard('image'), validate(retouchSchema), asyncHandler(submitRetouch));
router.post('/remove-bg', authMiddleware, heavyLimiter, tierGuard('image'), validate(removeBgSchema), asyncHandler(submitRemoveBg));
router.post('/white-bg', authMiddleware, heavyLimiter, tierGuard('image'), validate(whiteBgSchema), asyncHandler(submitWhiteBg));

// 任务查询
router.get('/tasks', authMiddleware, validate(paginationSchema, 'query'), asyncHandler(listMyTasks));
router.get('/tasks/:taskId', authMiddleware, validate(taskIdParamSchema, 'params'), asyncHandler(getTaskResult));
router.post('/tasks/:taskId/cancel', authMiddleware, validate(taskIdParamSchema, 'params'), asyncHandler(cancelTask));
router.post('/tasks/:taskId/retry', authMiddleware, validate(taskIdParamSchema, 'params'), asyncHandler(retryTask));

export default router;
