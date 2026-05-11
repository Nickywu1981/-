import { Router } from 'express';
import { listAllPlatforms, getPlatformConfig, getPlatformsByRegion } from '../controller/platformDetailController.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import { cacheMiddleware } from '../middleware/cache.js';
import { validate } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const regionQuerySchema = z.object({
  region: z.enum(['cn', 'intl']).optional().default('cn'),
});
const codeParamsSchema = z.object({
  code: z.string().min(1, '平台代码不能为空'),
});

router.use(authMiddleware);
router.use(rateLimiter);

// 平台列表缓存 30 分钟（极少变动）
router.get('/', cacheMiddleware(1800), listAllPlatforms);
router.get('/region', cacheMiddleware(1800), validate(regionQuerySchema, 'query'), getPlatformsByRegion);
router.get('/:code', cacheMiddleware(1800), validate(codeParamsSchema, 'params'), getPlatformConfig);

export default router;
