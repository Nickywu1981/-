import * as promptService from '../services/promptService.js';
import { success, listResult, error } from '../utils/response.js';
import { parsePagination } from '../utils/pagination.js';

// 管理后台：模板列表（含草稿/已下架等非公开）
export async function adminListTemplates(req, res) {
  try {
    const { category, status, keyword } = req.query;
    const { page, pageSize } = parsePagination(req.query);
    const r = await promptService.adminListTemplates({ category, status: status !== undefined ? +status : undefined, keyword, page, pageSize });
    listResult(res, r);
  } catch (e) { error(res, e.message, 500); }
}

// 创建或更新模板（管理员可直接上架/审核）
export async function adminSaveTemplate(req, res) {
  try {
    const result = await promptService.adminSaveTemplate(req.body);
    success(res, result, req.body.id ? '更新成功' : '创建成功');
  } catch (e) { error(res, e.message, 500); }
}

// 审核模板
export async function adminReviewTemplate(req, res) {
  try {
    const { status, reviewRemark } = req.body;
    const msg = await promptService.adminReviewTemplate(+req.params.id, { status, reviewRemark }, req.user?.id);
    success(res, null, msg);
  } catch (e) { error(res, e.message, 500); }
}

// 删除模板
export async function adminDeleteTemplate(req, res) {
  try {
    await promptService.adminDeleteTemplate(+req.params.id);
    success(res, null, '已删除');
  } catch (e) { error(res, e.message, 500); }
}
