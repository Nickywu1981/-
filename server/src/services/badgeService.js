import * as badgeDao from '../dao/badgeDao.js';

export async function listBadges(params) {
  return badgeDao.listBadges(params);
}

export async function getBadgeById(id) {
  return badgeDao.getBadgeById(id);
}

export async function createBadge(data) {
  return badgeDao.createBadge(data);
}

export async function updateBadge(id, data) {
  return badgeDao.updateBadge(id, data);
}

export async function deleteBadge(id) {
  return badgeDao.deleteBadge(id);
}

export async function getAvailableBadges() {
  return badgeDao.getAvailableBadges();
}

export default { listBadges, getBadgeById, createBadge, updateBadge, deleteBadge, getAvailableBadges };
