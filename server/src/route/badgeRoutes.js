import { Router } from 'express';
import { z } from 'zod';
import { listBadges, getBadge, listAllBadges, createBadge, updateBadge, deleteBadge } from '../controller/badgeController.js';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { cacheMiddleware } from '../middleware/cache.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../utils/validate.js';

const router = Router();

const idParamSchema = z.object({ id: z.string().regex(/^\d+$/).transform(Number) });

const badgeQuerySchema = z.object({ category: z.string().max(50).optional() });

const badgeSchema = z.object({
  name: z.string().min(1, '标签名称不能为空').max(20),
  type: z.enum(['promo', 'hot', 'new', 'free_shipping', 'limited']),
  icon: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, '颜色格式为#RRGGBB').optional(),
  active: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).optional().default(0),
});

// 公开端点：可用标签列表（无需登录）
router.get('/public', cacheMiddleware(300), validate(badgeQuerySchema, 'query'), asyncHandler(listBadges));

// 用户端：可用的标签列表（需登录，缓存 5 分钟）
router.get('/', authMiddleware, cacheMiddleware(300), validate(badgeQuerySchema, 'query'), asyncHandler(listBadges));
router.get('/:id', authMiddleware, validate(idParamSchema, 'params'), asyncHandler(getBadge));

// 管理端：CRUD
router.get('/admin/all', authMiddleware, adminAuth, validate(badgeQuerySchema, 'query'), asyncHandler(listAllBadges));
router.post('/admin', authMiddleware, adminAuth, validate(badgeSchema), asyncHandler(createBadge));
router.put('/admin/:id', authMiddleware, adminAuth, validate(idParamSchema, 'params'), validate(badgeSchema.partial()), asyncHandler(updateBadge));
router.delete('/admin/:id', authMiddleware, adminAuth, validate(idParamSchema, 'params'), asyncHandler(deleteBadge));

export default router;
