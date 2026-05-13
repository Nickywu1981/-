/**
 * 电商内容智能中间层路由
 */
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../utils/validate.js';
import { generate, listIntents, listIndustries } from '../controller/ecommerceController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

const generateSchema = z.object({
  userInput: z.string().min(1).max(2000),
  productName: z.string().max(200).optional(),
  productFeatures: z.string().max(2000).optional(),
  sellingPoints: z.string().max(2000).optional(),
  specs: z.string().max(3000).optional(),
  platform: z.enum(['taobao', 'tmall', 'jd', 'pinduoduo', 'douyin', 'kuaishou', 'xiaohongshu', 'shopee', 'lazada', 'amazon', 'tiktok', '通用']).optional(),
  industry: z.enum(['clothing', 'beauty', '3c_digital', 'food', 'home']).optional(),
  language: z.string().max(10).optional(),
  tone: z.enum(['professional', 'casual', 'urgent', 'luxury', 'trending']).optional(),
  extra: z.record(z.unknown()).optional(),
});

router.use(authMiddleware);
router.post('/generate', validate(generateSchema), generate);
router.get('/intents', listIntents);
router.get('/industries', listIndustries);

export default router;
