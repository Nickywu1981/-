/**
 * SKU Batch Routes — 多SKU批量生成路由
 * POST /api/sku-batch/image  — 批量图片生成
 * POST /api/sku-batch/video  — 批量视频生成
 * GET  /api/sku-batch/:id    — 批量任务状态
 */
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../utils/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import * as ctrl from '../controller/skuBatchController.js';

const router = Router();

const imageBatchSchema = z.object({
  imageUrl: z.string().url().max(2048),
  skus: z.array(z.object({
    color: z.string().max(30).optional(),
    colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    size: z.string().max(20).optional(),
    angle: z.enum(['front', 'back', 'side', 'detail', 'top']).optional(),
  })).min(1).max(50),
  platforms: z.array(z.enum([
    'taobao', 'pinduoduo', 'douyin', 'xiaohongshu',
    'amazon', 'shopee', 'lazada', 'temu', 'shein', 'tiktok_shop',
  ])).min(1).max(10),
  types: z.array(z.enum(['main', 'white_bg', 'scene', 'render'])).min(1).max(4),
  quality: z.enum(['standard', 'high']).optional().default('standard'),
});

const videoBatchSchema = z.object({
  productImages: z.array(z.string().url()).min(1).max(10),
  skus: z.array(z.object({
    color: z.string().max(30).optional(),
    size: z.string().max(20).optional(),
  })).min(1).max(20),
  platforms: z.array(z.enum(['taobao', 'douyin', 'pinduoduo', 'xiaohongshu', 'tiktok', 'youtube'])).min(1),
  duration: z.number().min(5).max(60).optional().default(15),
  style: z.enum(['showcase', 'story', 'review']).optional().default('showcase'),
});

router.post('/image', authMiddleware, heavyLimiter, validate(imageBatchSchema), ctrl.batchGenerateImages);
router.post('/video', authMiddleware, heavyLimiter, validate(videoBatchSchema), ctrl.batchGenerateVideos);
router.get('/:id', authMiddleware, ctrl.getBatchStatus);

export default router;
