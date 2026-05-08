import diyService from '../services/diyService.js';
import { success, error } from '../utils/response.js';
import { parsePagination } from '../utils/pagination.js';
import { ERROR_CODE } from '../constants/errorCode.js';

// ==================== 页面 CRUD ====================

export async function listPages(req, res) {
  try {
    const { pageType, status, keyword, ownerId, accessType } = req.query;
    const { page, pageSize } = parsePagination(req.query);
    const result = await diyService.listPages(req.tenantId, { pageType, status, keyword, ownerId, accessType, page, pageSize });
    return success(res, result);
  } catch (err) { return error(res, ERROR_CODE.INTERNAL_ERROR, err.message); }
}

export async function getPage(req, res) {
  try {
    const page = await diyService.getPageById(req.params.id, req.tenantId);
    if (!page) return error(res, ERROR_CODE.NOT_FOUND, '页面不存在');
    return success(res, page);
  } catch (err) { return error(res, ERROR_CODE.INTERNAL_ERROR, err.message); }
}

export async function createPage(req, res) {
  try {
    const { title, slug, pageType, accessType, mobileConfig, pcConfig, metaJson } = req.body;
    const page = await diyService.createPage(req.tenantId, req.user?.id, { title, slug, pageType, accessType, mobileConfig, pcConfig, metaJson });
    return success(res, page, '页面创建成功');
  } catch (err) { return error(res, err.statusCode || ERROR_CODE.INTERNAL_ERROR, err.message); }
}

export async function updatePage(req, res) {
  try {
    const page = await diyService.updatePage(req.params.id, req.tenantId, req.body);
    return success(res, page, '更新成功');
  } catch (err) { return error(res, err.statusCode || ERROR_CODE.INTERNAL_ERROR, err.message); }
}

// ==================== 状态机操作 ====================

export async function publishPage(req, res) {
  try {
    const result = await diyService.publishPage(req.params.id, req.tenantId);
    return success(res, result.page, result.msg);
  } catch (err) { return error(res, err.statusCode || ERROR_CODE.INTERNAL_ERROR, err.message); }
}

export async function unpublishPage(req, res) {
  try {
    const result = await diyService.unpublishPage(req.params.id, req.tenantId);
    return success(res, null, result.msg);
  } catch (err) { return error(res, err.statusCode || ERROR_CODE.INTERNAL_ERROR, err.message); }
}

export async function republishPage(req, res) {
  try {
    const result = await diyService.republishPage(req.params.id, req.tenantId);
    return success(res, result.page, result.msg);
  } catch (err) { return error(res, err.statusCode || ERROR_CODE.INTERNAL_ERROR, err.message); }
}

export async function softDeletePage(req, res) {
  try {
    const result = await diyService.softDeletePage(req.params.id, req.tenantId);
    return success(res, null, result.msg);
  } catch (err) { return error(res, err.statusCode || ERROR_CODE.INTERNAL_ERROR, err.message); }
}

export async function restorePage(req, res) {
  try {
    const result = await diyService.restorePage(req.params.id, req.tenantId);
    return success(res, null, result.msg);
  } catch (err) { return error(res, err.statusCode || ERROR_CODE.INTERNAL_ERROR, err.message); }
}

export async function hardDeletePage(req, res) {
  try {
    const result = await diyService.hardDeletePage(req.params.id, req.tenantId);
    return success(res, null, result.msg);
  } catch (err) { return error(res, err.statusCode || ERROR_CODE.INTERNAL_ERROR, err.message); }
}

// ==================== 公开访问 ====================

export async function getPublishedPage(req, res) {
  try {
    const page = await diyService.getPublishedPage(req.params.slug);
    if (!page) return error(res, ERROR_CODE.NOT_FOUND, '页面不存在或未发布');
    return success(res, page);
  } catch (err) { return error(res, ERROR_CODE.INTERNAL_ERROR, err.message); }
}

// ==================== 克隆 ====================

export async function clonePage(req, res) {
  try {
    const page = await diyService.clonePage(req.params.id, req.tenantId);
    return success(res, page, '页面已克隆');
  } catch (err) { return error(res, err.statusCode || ERROR_CODE.INTERNAL_ERROR, err.message); }
}

// ==================== 版本管理 ====================

export async function autoSaveVersion(req, res) {
  try {
    const { mobileConfig, pcConfig } = req.body;
    const result = await diyService.saveVersion(req.params.id, req.tenantId, mobileConfig, pcConfig, null, { autoSave: true });
    return success(res, result);
  } catch (err) { return error(res, err.statusCode || ERROR_CODE.INTERNAL_ERROR, err.message); }
}

export async function saveVersion(req, res) {
  try {
    const { mobileConfig, pcConfig, remark } = req.body;
    const result = await diyService.saveVersion(req.params.id, req.tenantId, mobileConfig, pcConfig, remark, { autoSave: false });
    return success(res, result, '版本已保存');
  } catch (err) { return error(res, err.statusCode || ERROR_CODE.INTERNAL_ERROR, err.message); }
}

export async function listVersions(req, res) {
  try {
    const { includeAuto } = req.query;
    const rows = await diyService.listVersions(req.params.id, req.tenantId, { includeAuto: includeAuto === 'true' });
    return success(res, rows);
  } catch (err) { return error(res, err.statusCode || ERROR_CODE.INTERNAL_ERROR, err.message); }
}

export async function getVersion(req, res) {
  try {
    const v = await diyService.getVersion(req.params.id, parseInt(req.params.version), req.tenantId);
    if (!v) return error(res, ERROR_CODE.NOT_FOUND, '版本不存在');
    return success(res, { version: v.version, mobileConfig: v.mobile_config, pcConfig: v.pc_config, remark: v.remark, autoSave: v.auto_save, rollbackFrom: v.rollback_from, createTime: v.create_time });
  } catch (err) { return error(res, err.statusCode || ERROR_CODE.INTERNAL_ERROR, err.message); }
}

export async function rollbackVersion(req, res) {
  try {
    const result = await diyService.rollbackVersion(req.params.id, parseInt(req.params.version), req.tenantId);
    return success(res, { version: result.version }, result.msg);
  } catch (err) { return error(res, err.statusCode || ERROR_CODE.INTERNAL_ERROR, err.message); }
}

export async function getLatestAutoVersion(req, res) {
  try {
    const v = await diyService.getLatestAutoVersion(req.params.id, req.tenantId);
    return success(res, v || null);
  } catch (err) { return error(res, err.statusCode || ERROR_CODE.INTERNAL_ERROR, err.message); }
}

// ==================== 批量操作 ====================

export async function batchPublish(req, res) {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) return error(res, ERROR_CODE.PARAM_ERROR, '请选择至少一个页面');
    const results = await diyService.batchPublish(ids, req.tenantId);
    const successCount = results.filter(r => r.success).length;
    return success(res, results, `成功${successCount}个，失败${results.length - successCount}个`);
  } catch (err) { return error(res, ERROR_CODE.INTERNAL_ERROR, err.message); }
}

export async function batchUnpublish(req, res) {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) return error(res, ERROR_CODE.PARAM_ERROR, '请选择至少一个页面');
    const result = await diyService.batchUnpublish(ids, req.tenantId);
    return success(res, null, `已下线${result.count}个页面`);
  } catch (err) { return error(res, ERROR_CODE.INTERNAL_ERROR, err.message); }
}

export async function batchDelete(req, res) {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) return error(res, ERROR_CODE.PARAM_ERROR, '请选择至少一个页面');
    const result = await diyService.batchDelete(ids, req.tenantId);
    return success(res, null, `已将${result.count}个页面移入回收站`);
  } catch (err) { return error(res, ERROR_CODE.INTERNAL_ERROR, err.message); }
}

// ==================== 组件库 ====================

export async function listComponents(req, res) {
  try {
    const { category } = req.query;
    const rows = await diyService.listComponents(req.tenantId, category);
    return success(res, rows);
  } catch (err) { return error(res, ERROR_CODE.INTERNAL_ERROR, err.message); }
}

export async function createComponent(req, res) {
  try {
    const { name, componentCode, category, icon, defaultConfig } = req.body;
    if (!name || !componentCode || !category) return error(res, ERROR_CODE.PARAM_ERROR, '组件名称、编码和分类不能为空');
    const id = await diyService.createComponent(req.tenantId, { name, componentCode, category, icon, defaultConfig });
    return success(res, { id }, '组件创建成功');
  } catch (err) { return error(res, ERROR_CODE.INTERNAL_ERROR, err.message); }
}

// ==================== 模板库 ====================

export async function listTemplates(req, res) {
  try {
    const { industry, pageType, keyword } = req.query;
    const { page, pageSize } = parsePagination(req.query);
    const result = await diyService.listTemplates({ industry, pageType, keyword, page, pageSize });
    return success(res, result);
  } catch (err) { return error(res, ERROR_CODE.INTERNAL_ERROR, err.message); }
}

export async function getTemplate(req, res) {
  try {
    const t = await diyService.getTemplateById(req.params.id);
    if (!t) return error(res, ERROR_CODE.NOT_FOUND, '模板不存在');
    return success(res, t);
  } catch (err) { return error(res, ERROR_CODE.INTERNAL_ERROR, err.message); }
}

export async function useTemplate(req, res) {
  try {
    await diyService.incrementTemplateUse(req.params.id);
    return success(res, null, 'ok');
  } catch (err) { return error(res, ERROR_CODE.INTERNAL_ERROR, err.message); }
}

export async function listTemplateIndustries(req, res) {
  try {
    const industries = await diyService.listTemplateIndustries();
    return success(res, industries);
  } catch (err) { return error(res, ERROR_CODE.INTERNAL_ERROR, err.message); }
}
