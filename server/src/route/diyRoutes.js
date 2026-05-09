import { Router } from 'express';
import { BusinessError } from '../utils/businessError.js';
import { authMiddleware, adminAuth, optionalAuth } from '../middleware/auth.js';
import { editorOrAbove } from '../middleware/rbac.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../utils/validate.js';
import { z } from 'zod';
import { ERROR_CODE } from '../constants/errorCodes.js';
import { success, error } from '../utils/response.js';
import * as diyService from '../services/diyService.js';
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
  pageType: z.enum(['mobile', 'pc', 'h5']).optional(),
  accessType: z.enum(['public', 'private']).optional(),
  mobileConfig: z.object({ sections: z.array(z.any()) }).optional(),
  pcConfig: z.object({ sections: z.array(z.any()) }).optional(),
  metaJson: z.object({}).passthrough().optional(),
});
const componentSchema = z.object({
  name: z.string().min(1, '组件名不能为空').max(100),
  componentCode: z.string().min(1, '组件编码不能为空').max(100),
  category: z.string().min(1, '分类不能为空').max(50),
  icon: z.string().optional(),
  defaultConfig: z.object({}).passthrough().optional(),
});
const idsSchema = z.object({ ids: z.array(z.number().or(z.string())).min(1, '至少选择一项') });

const versionSaveSchema = z.object({
  mobileConfig: z.any().optional(),
  pcConfig: z.any().optional(),
  remark: z.string().max(500).optional(),
});
const autoSaveSchema = z.object({
  mobileConfig: z.any().optional(),
  pcConfig: z.any().optional(),
});
const diffSchema = z.object({
  versionA: z.string().min(1),
  versionB: z.string().min(1),
});

// 路由参数校验 schemas
const idParamSchema = z.object({ id: z.string().regex(/^\d+$/, 'id 必须为正整数').transform(Number) });
const versionParamSchema = z.object({ id: z.string().regex(/^\d+$/, 'id 必须为正整数').transform(Number), version: z.string().regex(/^\d+$/, 'version 必须为正整数').transform(Number) });
const slugParamSchema = z.object({ slug: z.string().min(1, 'slug 不能为空').max(100) });
const templateIdParamSchema = z.object({ id: z.string().regex(/^\d+$/, 'id 必须为正整数').transform(Number) });
const versionsQuerySchema = z.object({ includeAuto: z.enum(['true', 'false']).optional() });

function validateParams(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) return next(new BusinessError(400, result.error.issues.map(i => i.message).join('; ')));
    req.params = result.data;
    next();
  };
}

function validateQuery(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) return next(new BusinessError(400, result.error.issues.map(i => i.message).join('; ')));
    req.query = result.data;
    next();
  };
}

// ==================== 公开路由 ====================
router.get('/published/:slug', validateParams(slugParamSchema), optionalAuth, asyncHandler(getPublishedPage));

// ==================== 认证路由 — CRUD ====================
router.get('/', authMiddleware, asyncHandler(listPages));
router.get('/components', authMiddleware, asyncHandler(listComponents));

// ==================== 模板库 — 必须在 /:id 之前注册 ====================
router.get('/templates/industries', authMiddleware, asyncHandler(listTemplateIndustries));
router.get('/templates', authMiddleware, asyncHandler(listTemplates));
router.get('/templates/:id', validateParams(templateIdParamSchema), authMiddleware, asyncHandler(getTemplate));
router.post('/templates/:id/use', validateParams(templateIdParamSchema), authMiddleware, asyncHandler(useTemplate));

router.get('/:id', validateParams(idParamSchema), authMiddleware, asyncHandler(getPage));
router.post('/', authMiddleware, editorOrAbove, validate(pageSchema), asyncHandler(createPage));
router.put('/:id', validateParams(idParamSchema), authMiddleware, editorOrAbove, validate(pageSchema.partial()), asyncHandler(updatePage));

// ==================== 状态机路由（发布=adminAuth, 编辑=editorOrAbove） ====================
router.post('/:id/publish', validateParams(idParamSchema), authMiddleware, adminAuth, asyncHandler(publishPage));
router.post('/:id/unpublish', validateParams(idParamSchema), authMiddleware, adminAuth, asyncHandler(unpublishPage));
router.post('/:id/republish', validateParams(idParamSchema), authMiddleware, adminAuth, asyncHandler(republishPage));
router.post('/:id/soft-delete', validateParams(idParamSchema), authMiddleware, adminAuth, asyncHandler(softDeletePage));
router.post('/:id/restore', validateParams(idParamSchema), authMiddleware, editorOrAbove, asyncHandler(restorePage));
router.delete('/:id/hard-delete', validateParams(idParamSchema), authMiddleware, adminAuth, asyncHandler(hardDeletePage));
router.post('/:id/clone', validateParams(idParamSchema), authMiddleware, editorOrAbove, asyncHandler(clonePage));

// ==================== 版本管理 ====================
router.get('/:id/versions', validateParams(idParamSchema), validateQuery(versionsQuerySchema), authMiddleware, asyncHandler(listVersions));
router.get('/:id/versions/latest-auto', validateParams(idParamSchema), authMiddleware, asyncHandler(getLatestAutoVersion));
router.get('/:id/versions/:version', validateParams(versionParamSchema), authMiddleware, asyncHandler(getVersion));
router.post('/:id/versions', validateParams(idParamSchema), authMiddleware, editorOrAbove, validate(versionSaveSchema), asyncHandler(saveVersion));
router.post('/:id/versions/auto-save', validateParams(idParamSchema), authMiddleware, editorOrAbove, validate(autoSaveSchema), asyncHandler(autoSaveVersion));
router.post('/:id/versions/:version/rollback', validateParams(versionParamSchema), authMiddleware, editorOrAbove, asyncHandler(rollbackVersion));

// ==================== 批量操作 ====================
router.post('/batch/publish', authMiddleware, adminAuth, validate(idsSchema), asyncHandler(batchPublish));
router.post('/batch/unpublish', authMiddleware, adminAuth, validate(idsSchema), asyncHandler(batchUnpublish));
router.post('/batch/delete', authMiddleware, adminAuth, validate(idsSchema), asyncHandler(batchDelete));

// ==================== 版本差异对比 ====================
function compareConfigs(a, b) {
  if (!a && !b) return [];
  if (!a) return [{ path: 'root', type: 'added', b: JSON.stringify(b) }];
  if (!b) return [{ path: 'root', type: 'removed', a: JSON.stringify(a) }];
  const diffs = [];
  const aSections = a?.sections || [];
  const bSections = b?.sections || [];
  const max = Math.max(aSections.length, bSections.length);
  for (let i = 0; i < max; i++) {
    if (!aSections[i]) { diffs.push({ path: `sections[${i}]`, type: 'added', b: bSections[i]?.type }); }
    else if (!bSections[i]) { diffs.push({ path: `sections[${i}]`, type: 'removed', a: aSections[i]?.type }); }
    else if (JSON.stringify(aSections[i]) !== JSON.stringify(bSections[i])) {
      diffs.push({ path: `sections[${i}]`, type: 'modified', aType: aSections[i]?.type, bType: bSections[i]?.type });
    }
  }
  return diffs;
}

router.post('/:id/versions/diff', validateParams(idParamSchema), authMiddleware, validate(diffSchema), asyncHandler(async (req, res) => {
  const { versionA, versionB } = req.body;
  const va = await diyService.getVersion(req.params.id, req.tenantId, versionA);
  const vb = await diyService.getVersion(req.params.id, req.tenantId, versionB);
  if (!va || !vb) return error(res, ERROR_CODE.NOT_FOUND, '版本不存在');
  const diff = compareConfigs(va.mobile_config, vb.mobile_config);
  success(res, { versionA: va, versionB: vb, diff });
}));

// ==================== 页面访问统计 ====================
router.get('/:id/stats', validateParams(idParamSchema), authMiddleware, asyncHandler(async (req, res) => {
  const page = await diyService.getPageById(req.params.id, req.tenantId);
  if (!page) return error(res, ERROR_CODE.NOT_FOUND, '页面不存在');
  success(res, {
    accessCount: page.access_count || 0,
    status: { 0: '草稿', 1: '已发布', 2: '已下线', 3: '回收站' }[page.status] || '未知',
    publishTime: page.publish_time,
    latestVersion: page.latest_published_version,
  });
}));

// ==================== 组件库 ====================
router.post('/components', authMiddleware, editorOrAbove, validate(componentSchema), asyncHandler(createComponent));

export default router;
