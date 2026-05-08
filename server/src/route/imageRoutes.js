import { Router } from 'express';
import {
  submitMainImage, submitSceneImage, submitDetailH5,
  submitBatchTask, submitRetouch, submitRemoveBg, submitWhiteBg,
  getTaskResult, listMyTasks,
} from '../controller/imageController.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import { tierGuard } from '../middleware/tierGuard.js';
import { validate, idSchema, paginationSchema } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

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
  productName: z.string().min(1, '产品名称不能为空').max(200),
  images: z.array(z.string().url()).min(1, '至少需要一张产品图'),
  platform: platformSchema,
  skuCount: z.coerce.number().int().min(1).optional(),
});
const batchTaskSchema = z.object({
  imageUrls: z.array(z.string().url()).min(1, '至少需要一张图片').max(500, '单次最多500张'),
  taskType: z.enum(['remove-bg', 'white-bg', 'main-image', 'scene', 'retouch']),
  platform: platformSchema.optional(),
  sceneCategory: z.string().optional(),
});
const singleImageSchema = z.object({ imageUrl: imageUrlSchema });

// 所有图片任务需要登录
router.post('/main-image', authMiddleware, tierGuard('image'), heavyLimiter, validate(mainImageSchema), asyncHandler(submitMainImage));
router.post('/scene', authMiddleware, tierGuard('image'), heavyLimiter, validate(sceneImageSchema), asyncHandler(submitSceneImage));
router.post('/detail-h5', authMiddleware, tierGuard('image'), heavyLimiter, validate(detailH5Schema), asyncHandler(submitDetailH5));
router.post('/batch', authMiddleware, tierGuard('image'), heavyLimiter, validate(batchTaskSchema), asyncHandler(submitBatchTask));
router.post('/retouch', authMiddleware, tierGuard('image'), heavyLimiter, validate(singleImageSchema), asyncHandler(submitRetouch));
router.post('/remove-bg', authMiddleware, tierGuard('image'), heavyLimiter, validate(singleImageSchema), asyncHandler(submitRemoveBg));
router.post('/white-bg', authMiddleware, tierGuard('image'), heavyLimiter, validate(singleImageSchema), asyncHandler(submitWhiteBg));

// 任务查询
router.get('/tasks', authMiddleware, validate(paginationSchema, 'query'), asyncHandler(listMyTasks));
router.get('/tasks/:taskId', authMiddleware, asyncHandler(getTaskResult));

export default router;
