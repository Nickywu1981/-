import * as tierDao from '../dao/tierDao.js';
import { tierConfig } from '../config/index.js';

const TIER_LIMITS = {
  free:  { dailyImages: tierConfig.free.dailyImages, dailyVideos: tierConfig.free.dailyVideos, maxBatch: tierConfig.free.maxBatch, watermark: tierConfig.free.watermark, exportHd: tierConfig.free.exportHd },
  vip:   { dailyImages: tierConfig.vip.dailyImages, dailyVideos: tierConfig.vip.dailyVideos, maxBatch: tierConfig.vip.maxBatch, watermark: tierConfig.vip.watermark, exportHd: tierConfig.vip.exportHd },
  admin: { dailyImages: Infinity, dailyVideos: Infinity, maxBatch: tierConfig.admin.maxBatch, watermark: false, exportHd: true },
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
