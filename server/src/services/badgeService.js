import * as badgeDao from '../dao/badgeDao.js';
import { BusinessError } from '../utils/businessError.js';

export async function listBadges(params) {
  return badgeDao.listBadges(params);
}

export async function getBadgeById(id) {
  return badgeDao.getBadgeById(id);
}

export async function createBadge(data) {
  if (!data.name) throw new BusinessError(400, '勋章名称不能为空');
  return badgeDao.createBadge(data);
}

export async function updateBadge(id, data) {
  if (!data || Object.keys(data).length === 0) throw new BusinessError(400, '没有可更新的字段');
  return badgeDao.updateBadge(id, data);
}

export async function deleteBadge(id) {
  return badgeDao.deleteBadge(id);
}

export async function getAvailableBadges() {
  return badgeDao.getAvailableBadges();
}

export default { listBadges, getBadgeById, createBadge, updateBadge, deleteBadge, getAvailableBadges };
