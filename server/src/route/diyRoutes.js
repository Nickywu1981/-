import { Router } from 'express';
import { authMiddleware, optionalAuth, adminAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../utils/validate.js';
import { z } from 'zod';
import { listPages, getPage, createPage, updatePage, publishPage, deletePage, getPublishedPage, saveVersion, listVersions, getVersion, listComponents, createComponent } from '../controller/diyController.js';

const router = Router();

const pageSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200),
  slug: z.string().min(1, '标识不能为空').max(100).regex(/^[a-z0-9_-]+$/, '标识仅允许小写字母、数字、下划线、连字符'),
  pageType: z.enum(['mobile', 'desktop', 'responsive']).optional(),
  configJson: z.object({ sections: z.array(z.any()) }).optional(),
  metaJson: z.object({}).passthrough().optional(),
});
const componentSchema = z.object({
  name: z.string().min(1, '组件名不能为空').max(100),
  category: z.string().max(50).optional(),
  configJson: z.object({}).passthrough(),
  thumbnail: z.string().optional(),
});

// 公开路由 - 访问已发布的DIY页面
router.get('/published/:slug', optionalAuth, asyncHandler(getPublishedPage));

// 需要认证
router.get('/', authMiddleware, asyncHandler(listPages));
router.get('/components', authMiddleware, asyncHandler(listComponents));
router.get('/:id', authMiddleware, asyncHandler(getPage));
router.post('/', authMiddleware, adminAuth, validate(pageSchema), asyncHandler(createPage));
router.put('/:id', authMiddleware, adminAuth, validate(pageSchema.partial()), asyncHandler(updatePage));
router.post('/:id/publish', authMiddleware, adminAuth, asyncHandler(publishPage));
router.delete('/:id', authMiddleware, adminAuth, asyncHandler(deletePage));

// 版本管理
router.get('/:id/versions', authMiddleware, asyncHandler(listVersions));
router.get('/:id/versions/:version', authMiddleware, asyncHandler(getVersion));
router.post('/:id/versions', authMiddleware, adminAuth, asyncHandler(saveVersion));

// 组件库管理
router.post('/components', authMiddleware, adminAuth, validate(componentSchema), asyncHandler(createComponent));

export default router;
