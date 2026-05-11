import { wrapController } from '../utils/wrapController.js';
import badgeService from '../services/badgeService.js';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export const listBadges = wrapController(async (req, res) => {
    const { category } = req.query;
    const rows = await badgeService.listBadges({ category, status: 1 });
    return success(res, rows);
})

export const getBadge = wrapController(async (req, res) => {
    const badge = await badgeService.getBadgeById(req.params.id);
    if (!badge) return error(res, ERROR_CODE.NOT_FOUND, '标签不存在');
    return success(res, badge);
})

export const listAllBadges = wrapController(async (req, res) => {
    const { category } = req.query;
    const rows = await badgeService.listBadges({ category, status: undefined });
    return success(res, rows);
})

export const createBadge = wrapController(async (req, res) => {
    const id = await badgeService.createBadge(req.body);
    return success(res, { id }, '创建成功');
})

export const updateBadge = wrapController(async (req, res) => {
    const ok = await badgeService.updateBadge(req.params.id, req.body);
    if (!ok) return error(res, ERROR_CODE.NOT_FOUND, '勋章不存在');
    return success(res, null, '更新成功');
})

export const deleteBadge = wrapController(async (req, res) => {
    const ok = await badgeService.deleteBadge(req.params.id);
    if (!ok) return error(res, ERROR_CODE.NOT_FOUND, '勋章不存在');
    return success(res, null, '删除成功');
})

export default { listBadges, getBadge, listAllBadges, createBadge, updateBadge, deleteBadge };
