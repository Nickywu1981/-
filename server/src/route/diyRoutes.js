import { Router } from 'express';
import { authMiddleware, adminAuth, optionalAuth } from '../middleware/auth.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import { editorOrAbove } from '../middleware/rbac.js';
import { validate, idParamSchema } from '../utils/validate.js';
import { z } from 'zod';
import * as ctrl from '../controller/diyController.js';

const router = Router();

const pageSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200),
  slug: z.string().min(1, '标识不能为空').max(100).regex(/^[a-z0-9_-]+$/, '标识仅允许小写字母、数字、下划线、连字符'),
  pageType: z.enum(['mobile', 'pc', 'h5', 'landing', 'detail', 'activity', 'custom']).optional(),
  accessType: z.enum(['public', 'private']).optional(),
  mobileConfig: z.object({ sections: z.array(z.unknown()) }).optional().refine(
    (v) => JSON.stringify(v).length <= 500000, '配置数据不能超过500KB',
  ),
  pcConfig: z.object({ sections: z.array(z.unknown()) }).optional().refine(
    (v) => JSON.stringify(v).length <= 500000, '配置数据不能超过500KB',
  ),
  metaJson: z.object({}).passthrough().optional().refine(
    (v) => JSON.stringify(v).length <= 100000, '元数据不能超过100KB',
  ),
});
const componentSchema = z.object({
  name: z.string().min(1, '组件名不能为空').max(100),
  componentCode: z.string().min(1, '组件编码不能为空').max(100),
  category: z.string().min(1, '分类不能为空').max(50),
  icon: z.string().optional(),
  defaultConfig: z.object({}).passthrough().optional().refine(
    (v) => JSON.stringify(v).length <= 200000, '组件默认配置不能超过200KB',
  ),
});
const idsSchema = z.object({ ids: z.array(z.number().or(z.string())).min(1, '至少选择一项') });

const versionSaveSchema = z.object({
  mobileConfig: z.unknown().optional().refine(
    (v) => v === undefined || JSON.stringify(v).length <= 500000, '配置数据不能超过500KB',
  ),
  pcConfig: z.unknown().optional().refine(
    (v) => v === undefined || JSON.stringify(v).length <= 500000, '配置数据不能超过500KB',
  ),
  remark: z.string().max(500).optional(),
});
const autoSaveSchema = z.object({
  mobileConfig: z.unknown().optional().refine(
    (v) => v === undefined || JSON.stringify(v).length <= 500000, '配置数据不能超过500KB',
  ),
  pcConfig: z.unknown().optional().refine(
    (v) => v === undefined || JSON.stringify(v).length <= 500000, '配置数据不能超过500KB',
  ),
});
const diffSchema = z.object({
  versionA: z.coerce.number().int().positive('版本号必须为正整数'),
  versionB: z.coerce.number().int().positive('版本号必须为正整数'),
});

// 路由参数校验 schemas
const versionParamSchema = z.object({ id: z.string().regex(/^\d+$/, 'id 必须为正整数').transform(Number), version: z.string().regex(/^\d+$/, 'version 必须为正整数').transform(Number) });
const slugParamSchema = z.object({ slug: z.string().min(1, 'slug 不能为空').max(100) });
const templateIdParamSchema = z.object({ id: z.string().regex(/^\d+$/, 'id 必须为正整数').transform(Number) });
const versionsQuerySchema = z.object({ includeAuto: z.enum(['true', 'false']).optional() });


// ==================== 公开路由 ====================
router.get('/published/:slug', validate(slugParamSchema, 'params'), optionalAuth, ctrl.getPublishedPage);

// ==================== 认证路由 — CRUD ====================
router.get('/', authMiddleware, ctrl.listPages);
router.get('/components', authMiddleware, ctrl.listComponents);

// ==================== 模板库 — 必须在 /:id 之前注册 ====================
router.get('/templates/industries', authMiddleware, ctrl.listTemplateIndustries);
router.get('/templates', authMiddleware, ctrl.listTemplates);
router.get('/templates/:id', validate(templateIdParamSchema, 'params'), authMiddleware, ctrl.getTemplate);
router.post('/templates/:id/use', validate(templateIdParamSchema, 'params'), authMiddleware, heavyLimiter, ctrl.useTemplate);

router.get('/:id', validate(idParamSchema, 'params'), authMiddleware, ctrl.getPage);
router.post('/', authMiddleware, heavyLimiter, editorOrAbove, validate(pageSchema), ctrl.createPage);
router.put('/:id', validate(idParamSchema, 'params'), authMiddleware, heavyLimiter, editorOrAbove, validate(pageSchema.partial()), ctrl.updatePage);

// ==================== 状态机路由（发布=adminAuth, 编辑=editorOrAbove） ====================
router.post('/:id/publish', validate(idParamSchema, 'params'), authMiddleware, heavyLimiter, adminAuth, ctrl.publishPage);
router.post('/:id/unpublish', validate(idParamSchema, 'params'), authMiddleware, heavyLimiter, adminAuth, ctrl.unpublishPage);
router.post('/:id/republish', validate(idParamSchema, 'params'), authMiddleware, heavyLimiter, adminAuth, ctrl.republishPage);
router.post('/:id/soft-delete', validate(idParamSchema, 'params'), authMiddleware, heavyLimiter, adminAuth, ctrl.softDeletePage);
router.post('/:id/restore', validate(idParamSchema, 'params'), authMiddleware, heavyLimiter, editorOrAbove, ctrl.restorePage);
router.delete('/:id/hard-delete', validate(idParamSchema, 'params'), authMiddleware, heavyLimiter, adminAuth, ctrl.hardDeletePage);
router.post('/:id/clone', validate(idParamSchema, 'params'), authMiddleware, heavyLimiter, editorOrAbove, ctrl.clonePage);

// ==================== 版本管理 ====================
router.get('/:id/versions', validate(idParamSchema, 'params'), validate(versionsQuerySchema, 'query'), authMiddleware, ctrl.listVersions);
router.get('/:id/versions/latest-auto', validate(idParamSchema, 'params'), authMiddleware, ctrl.getLatestAutoVersion);
router.get('/:id/versions/:version', validate(versionParamSchema, 'params'), authMiddleware, ctrl.getVersion);
router.post('/:id/versions', validate(idParamSchema, 'params'), authMiddleware, heavyLimiter, editorOrAbove, validate(versionSaveSchema), ctrl.saveVersion);
router.post('/:id/versions/auto-save', validate(idParamSchema, 'params'), authMiddleware, heavyLimiter, editorOrAbove, validate(autoSaveSchema), ctrl.autoSaveVersion);
router.post('/:id/versions/:version/rollback', validate(versionParamSchema, 'params'), authMiddleware, heavyLimiter, editorOrAbove, ctrl.rollbackVersion);

// ==================== 批量操作 ====================
router.post('/batch/publish', authMiddleware, heavyLimiter, adminAuth, validate(idsSchema), ctrl.batchPublish);
router.post('/batch/unpublish', authMiddleware, heavyLimiter, adminAuth, validate(idsSchema), ctrl.batchUnpublish);
router.post('/batch/delete', authMiddleware, heavyLimiter, adminAuth, validate(idsSchema), ctrl.batchDelete);

// ==================== 版本差异对比 ====================
router.post('/:id/versions/diff', validate(idParamSchema, 'params'), authMiddleware, heavyLimiter, validate(diffSchema), ctrl.diffVersions);

// ==================== 页面访问统计 ====================
router.get('/:id/stats', validate(idParamSchema, 'params'), authMiddleware, ctrl.getPageStats);

// ==================== 组件库 ====================
router.post('/components', authMiddleware, heavyLimiter, editorOrAbove, validate(componentSchema), ctrl.createComponent);

export default router;
