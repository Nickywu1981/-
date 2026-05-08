import { Router } from 'express';
import { listAllPlatforms, getPlatformConfig, getPlatformsByRegion } from '../controller/platformDetailController.js';
import { authMiddleware } from '../middleware/auth.js';
import { cacheMiddleware } from '../middleware/cache.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
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

// 平台列表缓存 30 分钟（极少变动）
router.get('/', cacheMiddleware(1800), asyncHandler(listAllPlatforms));
router.get('/region', cacheMiddleware(1800), validate(regionQuerySchema, 'query'), asyncHandler(getPlatformsByRegion));
router.get('/:code', cacheMiddleware(1800), validate(codeParamsSchema, 'params'), asyncHandler(getPlatformConfig));

export default router;
