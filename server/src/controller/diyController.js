import diyService from '../services/diyService.js';
import { success, error } from '../utils/response.js';
import { parsePagination } from '../utils/pagination.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { wrapController } from '../utils/wrapController.js';

// ==================== 页面 CRUD ====================

export const listPages = wrapController(async (req, res) => {
  const { pageType, status, keyword, ownerId, accessType } = req.query;
  const { page, pageSize } = parsePagination(req.query);
  const result = await diyService.listPages(req.tenantId, { pageType, status, keyword, ownerId, accessType, page, pageSize });
  return success(res, result);
});

export const getPage = wrapController(async (req, res) => {
  const page = await diyService.getPageById(req.params.id, req.tenantId);
  if (!page) return error(res, ERROR_CODE.NOT_FOUND, '页面不存在');
  return success(res, page);
});

export const createPage = wrapController(async (req, res) => {
  const { title, slug, pageType, accessType, mobileConfig, pcConfig, metaJson, description } = req.body;
  const mergedMeta = { ...(metaJson || {}), ...(description ? { description } : {}) };
  const page = await diyService.createPage(req.tenantId, req.user?.id, { title, slug, pageType, accessType, mobileConfig, pcConfig, metaJson: Object.keys(mergedMeta).length ? mergedMeta : undefined });
  return success(res, page, '页面创建成功');
});

export const updatePage = wrapController(async (req, res) => {
  const { description, ...rest } = req.body;
  if (description !== undefined) rest.metaJson = { ...(rest.metaJson || {}), description };
  const page = await diyService.updatePage(req.params.id, req.tenantId, rest);
  return success(res, page, '更新成功');
});

// ==================== 状态机操作 ====================

export const publishPage = wrapController(async (req, res) => {
  const result = await diyService.publishPage(req.params.id, req.tenantId);
  return success(res, result.page, result.msg);
});

export const unpublishPage = wrapController(async (req, res) => {
  const result = await diyService.unpublishPage(req.params.id, req.tenantId);
  return success(res, null, result.msg);
});

export const republishPage = wrapController(async (req, res) => {
  const result = await diyService.republishPage(req.params.id, req.tenantId);
  return success(res, result.page, result.msg);
});

export const softDeletePage = wrapController(async (req, res) => {
  const result = await diyService.softDeletePage(req.params.id, req.tenantId);
  return success(res, null, result.msg);
});

export const restorePage = wrapController(async (req, res) => {
  const result = await diyService.restorePage(req.params.id, req.tenantId);
  return success(res, null, result.msg);
});

export const hardDeletePage = wrapController(async (req, res) => {
  const result = await diyService.hardDeletePage(req.params.id, req.tenantId);
  return success(res, null, result.msg);
});

// ==================== 公开访问 ====================

export const getPublishedPage = wrapController(async (req, res) => {
  const page = await diyService.getPublishedPage(req.params.slug);
  if (!page) return error(res, ERROR_CODE.NOT_FOUND, '页面不存在或未发布');
  return success(res, page);
});

// ==================== 克隆 ====================

export const clonePage = wrapController(async (req, res) => {
  const page = await diyService.clonePage(req.params.id, req.tenantId);
  return success(res, page, '页面已克隆');
});

// ==================== 版本管理 ====================

export const autoSaveVersion = wrapController(async (req, res) => {
  const { mobileConfig, pcConfig } = req.body;
  const result = await diyService.saveVersion(req.params.id, req.tenantId, mobileConfig, pcConfig, null, { autoSave: true });
  return success(res, result);
});

export const saveVersion = wrapController(async (req, res) => {
  const { mobileConfig, pcConfig, remark } = req.body;
  const result = await diyService.saveVersion(req.params.id, req.tenantId, mobileConfig, pcConfig, remark, { autoSave: false });
  return success(res, result, '版本已保存');
});

export const listVersions = wrapController(async (req, res) => {
  const { includeAuto } = req.query;
  const rows = await diyService.listVersions(req.params.id, req.tenantId, { includeAuto: includeAuto === 'true' });
  return success(res, rows);
});

export const getVersion = wrapController(async (req, res) => {
  const v = await diyService.getVersion(req.params.id, parseInt(req.params.version), req.tenantId);
  if (!v) return error(res, ERROR_CODE.NOT_FOUND, '版本不存在');
  return success(res, { version: v.version, mobileConfig: v.mobile_config, pcConfig: v.pc_config, remark: v.remark, autoSave: v.auto_save, rollbackFrom: v.rollback_from, createTime: v.create_time });
});

export const rollbackVersion = wrapController(async (req, res) => {
  const result = await diyService.rollbackVersion(req.params.id, parseInt(req.params.version), req.tenantId);
  return success(res, { version: result.version }, result.msg);
});

export const getLatestAutoVersion = wrapController(async (req, res) => {
  const v = await diyService.getLatestAutoVersion(req.params.id, req.tenantId);
  return success(res, v || null);
});

// ==================== 批量操作 ====================

export const batchPublish = wrapController(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) return error(res, ERROR_CODE.PARAM_ERROR, '请选择至少一个页面');
  const results = await diyService.batchPublish(ids, req.tenantId);
  const successCount = results.filter(r => r.success).length;
  return success(res, results, `成功${successCount}个，失败${results.length - successCount}个`);
});

export const batchUnpublish = wrapController(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) return error(res, ERROR_CODE.PARAM_ERROR, '请选择至少一个页面');
  const result = await diyService.batchUnpublish(ids, req.tenantId);
  return success(res, null, `已下线${result.count}个页面`);
});

export const batchDelete = wrapController(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) return error(res, ERROR_CODE.PARAM_ERROR, '请选择至少一个页面');
  const result = await diyService.batchDelete(ids, req.tenantId);
  return success(res, null, `已将${result.count}个页面移入回收站`);
});

// ==================== 组件库 ====================

export const listComponents = wrapController(async (req, res) => {
  const { category } = req.query;
  const rows = await diyService.listComponents(req.tenantId, category);
  return success(res, rows);
});

export const createComponent = wrapController(async (req, res) => {
  const { name, componentCode, category, icon, defaultConfig } = req.body;
  if (!name || !componentCode || !category) return error(res, ERROR_CODE.PARAM_ERROR, '组件名称、编码和分类不能为空');
  const id = await diyService.createComponent(req.tenantId, { name, componentCode, category, icon, defaultConfig });
  return success(res, { id }, '组件创建成功');
});

// ==================== 模板库 ====================

export const listTemplates = wrapController(async (req, res) => {
  const { industry, pageType, keyword } = req.query;
  const { page, pageSize } = parsePagination(req.query);
  const result = await diyService.listTemplates({ industry, pageType, keyword, page, pageSize });
  return success(res, result);
});

export const getTemplate = wrapController(async (req, res) => {
  const t = await diyService.getTemplateById(req.params.id);
  if (!t) return error(res, ERROR_CODE.NOT_FOUND, '模板不存在');
  return success(res, t);
});

export const useTemplate = wrapController(async (req, res) => {
  await diyService.incrementTemplateUse(req.params.id);
  return success(res, null, 'ok');
});

export const listTemplateIndustries = wrapController(async (req, res) => {
  const industries = await diyService.listTemplateIndustries();
  return success(res, industries);
});
