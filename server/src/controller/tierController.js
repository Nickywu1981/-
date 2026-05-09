import tierService from '../services/tierService.js';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export async function getMyTier(req, res, next) {
  try {
    const tier = await tierService.getUserTier(req.userId);
    const limits = tierService.getTierLimits(tier);
    return success(res, { tier, limits });
  } catch (e) { next(e); }
}

export async function checkLimit(req, res, next) {
  try {
    const { type = 'image' } = req.query;
    const result = await tierService.checkDailyLimit(req.userId, type);
    return success(res, result);
  } catch (e) { next(e); }
}

export async function getExportPermission(req, res, next) {
  try {
    const [hd, noWatermark] = await Promise.all([
      tierService.canExportHd(req.userId),
      tierService.canExportWithoutWatermark(req.userId),
    ]);
    return success(res, { exportHd: hd, noWatermark });
  } catch (e) { next(e); }
}

export default { getMyTier, checkLimit, getExportPermission };
