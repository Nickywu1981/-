import { Router } from 'express';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import { adminOnly, editorOrAbove } from '../middleware/rbac.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../utils/validate.js';
import { z } from 'zod';
import {
  listPages, getPage, createPage, updatePage,
  publishPage, unpublishPage, republishPage,
  softDeletePage, restorePage, hardDeletePage,
  clonePage, getPublishedPage,
  saveVersion, autoSaveVersion, listVersions, getVersion, rollbackVersion, getLatestAutoVersion,
  batchPublish, batchUnpublish, batchDelete,
  listComponents, createComponent,
  listTemplates, getTemplate, useTemplate, listTemplateIndustries,
} from '../controller/diyController.js';

const router = Router();

const pageSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200),
  slug: z.string().min(1, '标识不能为空').max(100).regex(/^[a-z0-9_-]+$/, '标识仅允许小写字母、数字、下划线、连字符'),
  pageType: z.enum(['mobile', 'desktop', 'responsive']).optional(),
  accessType: z.enum(['public', 'private']).optional(),
  mobileConfig: z.object({ sections: z.array(z.any()) }).optional(),
  pcConfig: z.object({ sections: z.array(z.any()) }).optional(),
  metaJson: z.object({}).passthrough().optional(),
});
const componentSchema = z.object({
  name: z.string().min(1, '组件名不能为空').max(100),
  category: z.string().max(50).optional(),
  configJson: z.object({}).passthrough(),
  thumbnail: z.string().optional(),
});
const idsSchema = z.object({ ids: z.array(z.number().or(z.string())).min(1, '至少选择一项') });

// ==================== 公开路由 ====================
router.get('/published/:slug', optionalAuth, asyncHandler(getPublishedPage));

// ==================== 认证路由 — CRUD ====================
router.get('/', authMiddleware, asyncHandler(listPages));
router.get('/components', authMiddleware, asyncHandler(listComponents));
router.get('/:id', authMiddleware, asyncHandler(getPage));
router.post('/', authMiddleware, editorOrAbove, validate(pageSchema), asyncHandler(createPage));
router.put('/:id', authMiddleware, editorOrAbove, validate(pageSchema.partial()), asyncHandler(updatePage));

// ==================== 状态机路由（发布=adminOnly, 编辑=editorOrAbove） ====================
router.post('/:id/publish', authMiddleware, adminOnly, asyncHandler(publishPage));
router.post('/:id/unpublish', authMiddleware, adminOnly, asyncHandler(unpublishPage));
router.post('/:id/republish', authMiddleware, adminOnly, asyncHandler(republishPage));
router.post('/:id/soft-delete', authMiddleware, adminOnly, asyncHandler(softDeletePage));
router.post('/:id/restore', authMiddleware, editorOrAbove, asyncHandler(restorePage));
router.delete('/:id/hard-delete', authMiddleware, adminOnly, asyncHandler(hardDeletePage));
router.post('/:id/clone', authMiddleware, editorOrAbove, asyncHandler(clonePage));

// ==================== 版本管理 ====================
router.get('/:id/versions', authMiddleware, asyncHandler(listVersions));
router.get('/:id/versions/latest-auto', authMiddleware, asyncHandler(getLatestAutoVersion));
router.get('/:id/versions/:version', authMiddleware, asyncHandler(getVersion));
router.post('/:id/versions', authMiddleware, editorOrAbove, asyncHandler(saveVersion));
router.post('/:id/versions/auto-save', authMiddleware, editorOrAbove, asyncHandler(autoSaveVersion));
router.post('/:id/versions/:version/rollback', authMiddleware, editorOrAbove, asyncHandler(rollbackVersion));

// ==================== 批量操作 ====================
router.post('/batch/publish', authMiddleware, adminOnly, validate(idsSchema), asyncHandler(batchPublish));
router.post('/batch/unpublish', authMiddleware, adminOnly, validate(idsSchema), asyncHandler(batchUnpublish));
router.post('/batch/delete', authMiddleware, adminOnly, validate(idsSchema), asyncHandler(batchDelete));

// ==================== 组件库 ====================
router.post('/components', authMiddleware, editorOrAbove, validate(componentSchema), asyncHandler(createComponent));

// ==================== 模板库 ====================
router.get('/templates/industries', authMiddleware, asyncHandler(listTemplateIndustries));
router.get('/templates', authMiddleware, asyncHandler(listTemplates));
router.get('/templates/:id', authMiddleware, asyncHandler(getTemplate));
router.post('/templates/:id/use', authMiddleware, asyncHandler(useTemplate));

export default router;
