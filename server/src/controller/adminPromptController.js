import { wrapController } from '../utils/wrapController.js';
import * as promptService from '../services/promptService.js';
import { success, listResult, error } from '../utils/response.js';
import { parsePagination } from '../utils/pagination.js';
import { ERROR_CODE } from '../constants/errorCode.js';

// 管理后台：模板列表（含草稿/已下架等非公开）
export const adminListTemplates = wrapController(async (req, res) => {
    const { category, status, keyword } = req.query;
    const { page, pageSize } = parsePagination(req.query);
    const r = await promptService.adminListTemplates({ category, status: status !== undefined ? +status : undefined, keyword, page, pageSize });
    listResult(res, r);
}

// 创建或更新模板（管理员可直接上架/审核）
export const adminSaveTemplate = wrapController(async (req, res) => {
    const result = await promptService.adminSaveTemplate(req.body);
    success(res, result, req.body.id ? '更新成功' : '创建成功');
}

// 审核模板
export const adminReviewTemplate = wrapController(async (req, res) => {
    const { status, reviewRemark } = req.body;
    const msg = await promptService.adminReviewTemplate(+req.params.id, { status, reviewRemark }, req.user?.id);
    success(res, null, msg);
}

// 删除模板
export const adminDeleteTemplate = wrapController(async (req, res) => {
    await promptService.adminDeleteTemplate(+req.params.id);
    success(res, null, '已删除');
}
