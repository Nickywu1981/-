import { Router } from 'express';
import { z } from 'zod';
import { listBadges, getBadge, listAllBadges, createBadge, updateBadge, deleteBadge } from '../controller/badgeController.js';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import { cacheMiddleware } from '../middleware/cache.js';
import { csrfProtection } from '../middleware/csrf.js';
import { validate, idParamSchema } from '../utils/validate.js';

const router = Router();

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
router.get('/public', rateLimiter, cacheMiddleware(300), validate(badgeQuerySchema, 'query'), listBadges);

// 用户端：可用的标签列表（需登录，缓存 5 分钟）
router.get('/', authMiddleware, rateLimiter, cacheMiddleware(300), validate(badgeQuerySchema, 'query'), listBadges);
router.get('/:id', authMiddleware, rateLimiter, validate(idParamSchema, 'params'), getBadge);

// 管理端：CRUD
router.get('/admin/all', authMiddleware, rateLimiter, adminAuth, validate(badgeQuerySchema, 'query'), listAllBadges);
router.post('/admin', authMiddleware, rateLimiter, adminAuth, csrfProtection, validate(badgeSchema), createBadge);
router.put('/admin/:id', authMiddleware, rateLimiter, adminAuth, csrfProtection, validate(idParamSchema, 'params'), validate(badgeSchema.partial()), updateBadge);
router.delete('/admin/:id', authMiddleware, rateLimiter, adminAuth, csrfProtection, validate(idParamSchema, 'params'), deleteBadge);

export default router;
