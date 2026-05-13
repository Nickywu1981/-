/**
 * Movio AI v4.1 — Assets Routes (素材库)
 * G5 后端开发 | W4
 * GET /api/assets/list — 聚合用户所有作品(图片+视频)
 */
import { Router } from 'express';
import z from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../utils/validate.js';
import * as ctrl from '../controller/v4AssetsController.js';

const router = Router();
router.use(rateLimiter);

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(24),
  type: z.enum(['image', 'video']).optional(),
});

router.get('/list', validate(listQuerySchema, 'query'), ctrl.getList);

export default router;
