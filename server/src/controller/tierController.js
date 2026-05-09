import tierService from '../services/tierService.js';
import { success } from '../utils/response.js';

export async function getMyTier(req, res) {
  const tier = await tierService.getUserTier(req.userId);
  const limits = tierService.getTierLimits(tier);
  return success(res, { tier, limits });
}

export async function checkLimit(req, res) {
  const { type = 'image' } = req.query;
  const result = await tierService.checkDailyLimit(req.userId, type);
  return success(res, result);
}

export async function getExportPermission(req, res) {
  const [hd, noWatermark] = await Promise.all([
    tierService.canExportHd(req.userId),
    tierService.canExportWithoutWatermark(req.userId),
  ]);
  return success(res, { exportHd: hd, noWatermark });
}

export default { getMyTier, checkLimit, getExportPermission };
