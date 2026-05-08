import badgeService from '../services/badgeService.js';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export async function listBadges(req, res) {
  try {
    const { category } = req.query;
    const rows = await badgeService.listBadges({ category, status: 1 });
    return success(res, rows);
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message);
  }
}

export async function getBadge(req, res) {
  try {
    const badge = await badgeService.getBadgeById(req.params.id);
    if (!badge) return error(res, ERROR_CODE.NOT_FOUND, '标签不存在');
    return success(res, badge);
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message);
  }
}

export async function listAllBadges(req, res) {
  try {
    const { category } = req.query;
    const rows = await badgeService.listBadges({ category, status: undefined });
    return success(res, rows);
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message);
  }
}

export async function createBadge(req, res) {
  try {
    const id = await badgeService.createBadge(req.body);
    return success(res, { id }, '创建成功');
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message);
  }
}

export async function updateBadge(req, res) {
  try {
    await badgeService.updateBadge(req.params.id, req.body);
    return success(res, null, '更新成功');
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message);
  }
}

export async function deleteBadge(req, res) {
  try {
    await badgeService.deleteBadge(req.params.id);
    return success(res, null, '删除成功');
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message);
  }
}

export default { listBadges, getBadge, listAllBadges, createBadge, updateBadge, deleteBadge };
