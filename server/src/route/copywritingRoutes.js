import { Router } from 'express';
import { generateTitles, generateDescription, translateProduct, listPlatforms, listLanguages, listHistory, deleteHistory } from '../controller/copywritingController.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const titleGenSchema = z.object({
  productName: z.string().min(1).max(200),
  category: z.string().max(100).optional(),
  sellingPoints: z.string().max(1000).optional(),
  platform: z.enum(['taobao','tmall','jd','pinduoduo','douyin','shopee','lazada','amazon','tiktok']).optional(),
  language: z.string().max(10).optional(),
  count: z.number().int().min(1).max(20).optional(),
  tone: z.enum(['professional','casual','urgent','luxury']).optional(),
  audience: z.string().max(100).optional(),
  model: z.string().max(50).optional(),
});

const descriptionSchema = z.object({
  productName: z.string().min(1).max(200),
  features: z.string().max(2000).optional(),
  specs: z.string().max(2000).optional(),
  platform: z.string().max(50).optional(),
  language: z.string().max(10).optional(),
  tone: z.enum(['professional','casual','urgent','luxury']).optional(),
  model: z.string().max(50).optional(),
});

const translateSchema = z.object({
  productName: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  features: z.string().max(2000).optional(),
  sourceLang: z.string().max(10).optional(),
  targetLang: z.string().min(1).max(10),
  model: z.string().max(50).optional(),
});

router.use(authMiddleware);

// 生成
router.post('/titles', validate(titleGenSchema), asyncHandler(generateTitles));
router.post('/description', validate(descriptionSchema), asyncHandler(generateDescription));
router.post('/translate', validate(translateSchema), asyncHandler(translateProduct));

// 参考数据
router.get('/platforms', asyncHandler(listPlatforms));
router.get('/languages', asyncHandler(listLanguages));

// 历史
router.get('/history', asyncHandler(listHistory));
router.delete('/history/:id', asyncHandler(deleteHistory));

export default router;
