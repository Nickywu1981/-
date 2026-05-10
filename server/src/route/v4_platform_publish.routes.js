import { Router } from 'express';
import { z } from 'zod';
import { validateV4 as _validate } from '../utils/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import platformPublishController from '../controller/platformPublishController.js';

const router = Router();

router.use(authMiddleware);

const bindSchema = z.object({
  platform: z.enum(['taobao', 'jd', 'pdd', 'douyin', 'kuaishou', 'shopee']),
  appKey: z.string().min(1),
  appSecret: z.string().min(1),
  accessToken: z.string().optional(),
  shopName: z.string().optional(),
});

const publishSchema = z.object({
  platform: z.enum(['taobao', 'jd', 'pdd', 'douyin', 'kuaishou', 'shopee']),
  itemId: z.string().optional(),
  title: z.string().min(1, '请输入商品标题').max(256),
  description: z.string().optional(),
  images: z.array(z.string().url()).optional(),
  price: z.number().positive().optional(),
});

// GET /api/platform-publish/platforms
router.get('/platforms', platformPublishController.getPlatforms);

// GET /api/platform-publish/bindings
router.get('/bindings', platformPublishController.getMyBindings);

// POST /api/platform-publish/bind
router.post('/bind', _validate(bindSchema), platformPublishController.bindPlatform);

// DELETE /api/platform-publish/unbind/:platform
router.delete('/unbind/:platform', platformPublishController.unbind);

// POST /api/platform-publish/publish
router.post('/publish', _validate(publishSchema), platformPublishController.publish);

// GET /api/platform-publish/history
router.get('/history', platformPublishController.getPublishHistory);

export default router;
