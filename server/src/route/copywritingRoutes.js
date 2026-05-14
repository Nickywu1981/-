import { Router } from 'express';
import { generateTitles, generateDescription, generateScript, translateProduct, listPlatforms, listLanguages, listHistory, deleteHistory } from '../controller/copywritingController.js';

import { authMiddleware } from '../middleware/auth.js';
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

const scriptSchema = z.object({
  productName: z.string().min(1).max(200),
  platform: z.enum(['taobao','tmall','jd','pinduoduo','douyin','shopee','lazada','amazon','tiktok','xiaohongshu','kuaishou','alibaba_intl','wish']).optional(),
  duration: z.number().int().min(15).max(180).optional(),
  style: z.enum(['trending','storytelling','tutorial','unboxing','review']).optional(),
  language: z.string().max(10).optional(),
  hookStyle: z.enum(['question','shock','curiosity','problem']).optional(),
  model: z.string().max(50).optional(),
});

const historyQuerySchema = z.object({ type: z.string().max(50).optional() });


// 生成
router.post('/titles', authMiddleware, validate(titleGenSchema), generateTitles);
router.post('/description', authMiddleware, validate(descriptionSchema), generateDescription);
router.post('/script', authMiddleware, validate(scriptSchema), generateScript);
router.post('/translate', authMiddleware, validate(translateSchema), translateProduct);

// 参考数据
router.get('/platforms', authMiddleware, listPlatforms);
router.get('/languages', authMiddleware, listLanguages);

// 历史
router.get('/history', authMiddleware, validate(historyQuerySchema, 'query'), listHistory);
router.delete('/history/:id', authMiddleware, validate(z.object({ id: z.string().regex(/^\d+$/).transform(Number) }), 'params'), deleteHistory);

export default router;
