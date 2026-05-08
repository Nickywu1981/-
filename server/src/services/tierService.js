import * as tierDao from '../dao/tierDao.js';

const TIER_LIMITS = {
  free:  { dailyImages: 5, dailyVideos: 2, maxBatch: 10, watermark: true, exportHd: false },
  vip:   { dailyImages: 100, dailyVideos: 30, maxBatch: 50, watermark: false, exportHd: true },
  admin: { dailyImages: Infinity, dailyVideos: Infinity, maxBatch: 100, watermark: false, exportHd: true },
};

export async function getUserTier(userId) {
  return tierDao.getUserPlan(userId);
}

export function getTierLimits(tier) {
  return TIER_LIMITS[tier] || TIER_LIMITS.free;
}

export async function checkDailyLimit(userId, type) {
  const tier = await getUserTier(userId);
  const limits = getTierLimits(tier);
  const max = type === 'video' ? limits.dailyVideos : limits.dailyImages;
  if (max === Infinity) return { allowed: true, current: 0, max };

  const current = await tierDao.countTodayTasks(userId, type);
  return { allowed: current < max, current, max };
}

export async function canExportHd(userId) {
  const tier = await getUserTier(userId);
  return getTierLimits(tier).exportHd;
}

export async function canExportWithoutWatermark(userId) {
  const tier = await getUserTier(userId);
  return !getTierLimits(tier).watermark;
}

export default { getUserTier, getTierLimits, checkDailyLimit, canExportHd, canExportWithoutWatermark, TIER_LIMITS };
