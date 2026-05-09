import * as promptService from '../services/promptService.js';
import { success, error, listResult } from '../utils/response.js';
import { parsePagination } from '../utils/pagination.js';
import { ERROR_CODE } from '../constants/errorCode.js';

// ==================== 模板 ====================
export async function listTemplates(req, res) {
  try {
    const { category, keyword } = req.query;
    const { page, pageSize } = parsePagination(req.query);
    const result = await promptService.listAvailable(req.user.id, { category, keyword, page, pageSize });
    listResult(res, result);
  } catch (e) { error(res, e.status || 500, e.message); }
}

export async function getTemplateDetail(req, res) {
  try {
    const t = await promptService.useTemplate(req.user.id, +req.params.id);
    if (!t) return error(res, ERROR_CODE.NOT_FOUND, '模板不存在');
    success(res, t);
  } catch (e) { error(res, e.status || 500, e.message); }
}

export async function createTemplate(req, res) {
  try {
    const id = await promptService.createTemplate(req.user.id, req.body);
    success(res, { id }, '创建成功');
  } catch (e) { error(res, e.status || 500, e.message); }
}

export async function submitForReview(req, res) {
  try {
    await promptService.submitForReview(req.user.id, +req.params.id);
    success(res, null, '已提交审核');
  } catch (e) { error(res, e.status || 500, e.message); }
}

export async function fillAndPreview(req, res) {
  try {
    const data = await promptService.fillAndPreview(req.user.id, +req.params.id, req.body.values || {});
    success(res, data);
  } catch (e) { error(res, e.status || 500, e.message); }
}

// ==================== 收藏 ====================
export async function listFavorites(req, res) {
  try {
    const { groupId } = req.query;
    const { page, pageSize } = parsePagination(req.query);
    const result = await promptService.listFavorites(req.user.id, { groupId: groupId ? +groupId : undefined, page, pageSize });
    listResult(res, result);
  } catch (e) { error(res, e.status || 500, e.message); }
}

export async function toggleFavorite(req, res) {
  try {
    const { templateId, groupId } = req.body;
    const result = await promptService.toggleFavorite(req.user.id, templateId, groupId);
    success(res, result, result.favorited ? '已收藏' : '已取消');
  } catch (e) { error(res, e.status || 500, e.message); }
}

// ==================== 分组 ====================
export async function listGroups(req, res) {
  try {
    const groups = await promptService.listGroups(req.user.id);
    success(res, groups);
  } catch (e) { error(res, e.status || 500, e.message); }
}

export async function createGroup(req, res) {
  try {
    const id = await promptService.createGroup(req.user.id, req.body.name);
    success(res, { id }, '分组创建成功');
  } catch (e) { error(res, e.status || 500, e.message); }
}

export async function renameGroup(req, res) {
  try {
    await promptService.renameGroup(req.user.id, +req.params.id, req.body.name);
    success(res, null, '已重命名');
  } catch (e) { error(res, e.status || 500, e.message); }
}

export async function deleteGroup(req, res) {
  try {
    await promptService.removeGroup(req.user.id, +req.params.id);
    success(res, null, '已删除');
  } catch (e) { error(res, e.status || 500, e.message); }
}

// ==================== 智能推荐 ====================
export async function getRecommendations(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 12, 30);
    const list = await promptService.getRecommendations(req.user.id, { limit });
    success(res, { list });
  } catch (e) { error(res, e.status || 500, e.message); }
}

// ==================== 使用历史 ====================
export async function recordUsage(req, res) {
  try {
    await promptService.recordUsage(req.user.id, +req.params.id, req.body.filledContent, req.body.modelType);
    success(res, null, '已记录');
  } catch (e) { error(res, e.status || 500, e.message); }
}

export async function usageHistory(req, res) {
  try {
    const { page, pageSize } = parsePagination(req.query);
    const result = await promptService.listUsageHistory(req.user.id, { page, pageSize });
    listResult(res, result);
  } catch (e) { error(res, e.status || 500, e.message); }
}

// ==================== 评分 ====================
export async function rateTemplate(req, res) {
  try {
    const result = await promptService.rateTemplate(req.user.id, +req.params.id, req.body.score);
    success(res, result, '评分成功');
  } catch (e) { error(res, e.status || 500, e.message); }
}

export async function getTemplateRating(req, res) {
  try {
    const rating = await promptService.getRating(req.user.id, +req.params.id);
    success(res, rating);
  } catch (e) { error(res, e.status || 500, e.message); }
}
