import diyService from '../services/diyService.js';
import { success, error } from '../utils/response.js';
import { parsePagination } from '../utils/pagination.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export async function listPages(req, res) {
  try {
    const { pageType, status, keyword } = req.query;
    const { page, pageSize } = parsePagination(req.query);
    const result = await diyService.listPages(req.tenantId, { pageType, status, keyword, page, pageSize });
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
    const { title, slug, pageType, configJson, metaJson } = req.body;
    if (!title || !slug) return error(res, ERROR_CODE.PARAM_ERROR, '标题和标识不能为空');
    const page = await diyService.createPage(req.tenantId, { title, slug, pageType: pageType || 'mobile', configJson: configJson || { sections: [] }, metaJson });
    return success(res, page, '页面创建成功');
  } catch (err) { return error(res, ERROR_CODE.INTERNAL_ERROR, err.message); }
}

export async function updatePage(req, res) {
  try {
    const page = await diyService.updatePage(req.params.id, req.tenantId, req.body);
    return success(res, page, '更新成功');
  } catch (err) { return error(res, ERROR_CODE.INTERNAL_ERROR, err.message); }
}

export async function publishPage(req, res) {
  try {
    const page = await diyService.publishPage(req.params.id, req.tenantId);
    return success(res, page, '发布成功');
  } catch (err) { return error(res, ERROR_CODE.INTERNAL_ERROR, err.message); }
}

export async function deletePage(req, res) {
  try {
    await diyService.deletePage(req.params.id, req.tenantId);
    return success(res, null, '删除成功');
  } catch (err) { return error(res, ERROR_CODE.INTERNAL_ERROR, err.message); }
}

export async function getPublishedPage(req, res) {
  try {
    const page = await diyService.getPublishedPage(req.params.slug);
    if (!page) return error(res, ERROR_CODE.NOT_FOUND, '页面不存在或未发布');
    return success(res, page);
  } catch (err) { return error(res, ERROR_CODE.INTERNAL_ERROR, err.message); }
}

export async function saveVersion(req, res) {
  try {
    const { configJson, remark } = req.body;
    const v = await diyService.saveVersion(req.params.id, configJson, remark || '手动保存');
    return success(res, { version: v }, `版本 ${v} 已保存`);
  } catch (err) { return error(res, ERROR_CODE.INTERNAL_ERROR, err.message); }
}

export async function listVersions(req, res) {
  try {
    const rows = await diyService.listVersions(req.params.id, req.tenantId);
    return success(res, rows);
  } catch (err) { return error(res, ERROR_CODE.INTERNAL_ERROR, err.message); }
}

export async function getVersion(req, res) {
  try {
    const v = await diyService.getVersion(req.params.id, parseInt(req.params.version), req.tenantId);
    if (!v) return error(res, ERROR_CODE.NOT_FOUND, '版本不存在');
    return success(res, { version: v.version, config_json: JSON.parse(v.config_json), remark: v.remark, create_time: v.create_time });
  } catch (err) { return error(res, ERROR_CODE.INTERNAL_ERROR, err.message); }
}

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
