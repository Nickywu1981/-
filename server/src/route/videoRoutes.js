import { Router } from 'express';
import {
  submitImg2Video, submitMulti2Video, submitVideoPackaging,
  submitActionTransfer, submitPersonReplace, submitDigitalHuman,
  getVideoTaskResult, listMyVideoTasks,
} from '../controller/videoController.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import { validate, paginationSchema } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const imageUrlSchema = z.string().url('请提供有效的图片URL');
const img2VideoSchema = z.object({
  imageUrl: imageUrlSchema,
  duration: z.coerce.number().int().min(10).max(60).optional(),
  platform: z.string().optional(),
});
const multi2VideoSchema = z.object({
  imageUrls: z.array(imageUrlSchema).min(1, '至少需要一张图片').max(100),
  platform: z.string().optional(),
  bgm: z.string().optional(),
});
const packagingSchema = z.object({
  videoUrl: z.string().min(1, '请提供视频URL'),
  subtitle: z.boolean().optional(),
  bgm: z.string().optional(),
  stickers: z.array(z.string()).optional(),
});
const transferSchema = z.object({
  sourceImageUrl: z.string().url('请提供有效的源图片URL'),
  actionVideoUrl: z.string().url('请提供有效的动作视频URL'),
  targetAction: z.string().optional(),
});
const replaceSchema = z.object({
  sourceImageUrl: z.string().url('请提供有效的商品图片URL'),
  targetPersonUrl: z.string().url('请提供有效的目标人物图片URL'),
});
const digitalHumanSchema = z.object({
  script: z.string().min(1, '脚本不能为空'), voice: z.string().optional(), avatar: z.string().optional(), background: z.string().optional(),
});

// 视频生成
router.post('/img2video', authMiddleware, heavyLimiter, validate(img2VideoSchema), asyncHandler(submitImg2Video));
router.post('/multi2video', authMiddleware, heavyLimiter, validate(multi2VideoSchema), asyncHandler(submitMulti2Video));
router.post('/packaging', authMiddleware, heavyLimiter, validate(packagingSchema), asyncHandler(submitVideoPackaging));

// 视频进阶
router.post('/action-transfer', authMiddleware, heavyLimiter, validate(transferSchema), asyncHandler(submitActionTransfer));
router.post('/person-replace', authMiddleware, heavyLimiter, validate(replaceSchema), asyncHandler(submitPersonReplace));
router.post('/digital-human', authMiddleware, heavyLimiter, validate(digitalHumanSchema), asyncHandler(submitDigitalHuman));

// 任务查询
router.get('/tasks', authMiddleware, validate(paginationSchema, 'query'), asyncHandler(listMyVideoTasks));
router.get('/tasks/:taskId', authMiddleware, asyncHandler(getVideoTaskResult));

export default router;
