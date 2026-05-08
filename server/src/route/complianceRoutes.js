import { Router } from 'express';
import { listTargets, check, getRules } from '../controller/complianceController.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const checkSchema = z.object({
  content: z.string().min(1).max(10000),
  platform: z.enum(['taobao', 'jd', 'pdd', 'douyin', 'kuaishou', 'xiaohongshu', 'shopee', 'lazada', 'amazon', 'ebay', 'general']),
  language: z.string().max(10).optional(),
});

router.use(authMiddleware);

router.get('/targets', asyncHandler(listTargets));
router.get('/rules/:code', asyncHandler(getRules));
router.post('/check', validate(checkSchema), asyncHandler(check));

export default router;
