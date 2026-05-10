import { wrapController } from '../utils/wrapController.js';
import * as promptService from '../services/promptService.js';
import { success, error, listResult } from '../utils/response.js';
import { parsePagination } from '../utils/pagination.js';
import { ERROR_CODE } from '../constants/errorCode.js';

// ==================== 模板 ====================
export const listTemplates = wrapController(async (req, res) => {
    const { category, keyword } = req.query;
    const { page, pageSize } = parsePagination(req.query);
    const result = await promptService.listAvailable(req.user.id, { category, keyword, page, pageSize });
    listResult(res, result);
})

export const getTemplateDetail = wrapController(async (req, res) => {
    const t = await promptService.useTemplate(req.user.id, +req.params.id);
    if (!t) return error(res, ERROR_CODE.NOT_FOUND, '模板不存在');
    success(res, t);
})

export const createTemplate = wrapController(async (req, res) => {
    const id = await promptService.createTemplate(req.user.id, req.body);
    success(res, { id }, '创建成功');
})

export const submitForReview = wrapController(async (req, res) => {
    await promptService.submitForReview(req.user.id, +req.params.id);
    success(res, null, '已提交审核');
})

export const fillAndPreview = wrapController(async (req, res) => {
    const data = await promptService.fillAndPreview(req.user.id, +req.params.id, req.body.values || {});
    success(res, data);
})

// ==================== 收藏 ====================
export const listFavorites = wrapController(async (req, res) => {
    const { groupId } = req.query;
    const { page, pageSize } = parsePagination(req.query);
    const result = await promptService.listFavorites(req.user.id, { groupId: groupId ? +groupId : undefined, page, pageSize });
    listResult(res, result);
})

export const toggleFavorite = wrapController(async (req, res) => {
    const { templateId, groupId } = req.body;
    const result = await promptService.toggleFavorite(req.user.id, templateId, groupId);
    success(res, result, result.favorited ? '已收藏' : '已取消');
})

// ==================== 分组 ====================
export const listGroups = wrapController(async (req, res) => {
    const groups = await promptService.listGroups(req.user.id);
    success(res, groups);
})

export const createGroup = wrapController(async (req, res) => {
    const id = await promptService.createGroup(req.user.id, req.body.name);
    success(res, { id }, '分组创建成功');
})

export const renameGroup = wrapController(async (req, res) => {
    await promptService.renameGroup(req.user.id, +req.params.id, req.body.name);
    success(res, null, '已重命名');
})

export const deleteGroup = wrapController(async (req, res) => {
    await promptService.removeGroup(req.user.id, +req.params.id);
    success(res, null, '已删除');
})

// ==================== 智能推荐 ====================
export const getRecommendations = wrapController(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 12, 30);
    const list = await promptService.getRecommendations(req.user.id, { limit });
    success(res, { list });
})

// ==================== 使用历史 ====================
export const recordUsage = wrapController(async (req, res) => {
    await promptService.recordUsage(req.user.id, +req.params.id, req.body.filledContent, req.body.modelType);
    success(res, null, '已记录');
})

export const usageHistory = wrapController(async (req, res) => {
    const { page, pageSize } = parsePagination(req.query);
    const result = await promptService.listUsageHistory(req.user.id, { page, pageSize });
    listResult(res, result);
})

// ==================== 评分 ====================
export const rateTemplate = wrapController(async (req, res) => {
    const result = await promptService.rateTemplate(req.user.id, +req.params.id, req.body.score);
    success(res, result, '评分成功');
})

export const getTemplateRating = wrapController(async (req, res) => {
    const rating = await promptService.getRating(req.user.id, +req.params.id);
    success(res, rating);
})
