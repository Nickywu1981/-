import * as badgeDao from '../dao/badgeDao.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export async function listBadges(params) {
  return badgeDao.listBadges(params);
}

export async function getBadgeById(id) {
  return badgeDao.getBadgeById(id);
}

export async function createBadge(data) {
  if (!data.name) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
  return badgeDao.createBadge(data);
}

export async function updateBadge(id, data) {
  if (!data || Object.keys(data).length === 0) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
  return badgeDao.updateBadge(id, data);
}

export async function deleteBadge(id) {
  return badgeDao.deleteBadge(id);
}

export async function getAvailableBadges() {
  return badgeDao.listBadges({ status: 1 });
}

export default { listBadges, getBadgeById, createBadge, updateBadge, deleteBadge, getAvailableBadges };
