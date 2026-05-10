import { wrapController } from '../utils/wrapController.js';
import tierService from '../services/tierService.js';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export const getMyTier = wrapController(async (req, res, next) => {
    const tier = await tierService.getUserTier(req.userId);
    const limits = tierService.getTierLimits(tier);
    return success(res, { tier, limits });
})

export const checkLimit = wrapController(async (req, res, next) => {
    const { type = 'image' } = req.query;
    const result = await tierService.checkDailyLimit(req.userId, type);
    return success(res, result);
})

export const getExportPermission = wrapController(async (req, res, next) => {
    const [hd, noWatermark] = await Promise.all([
      tierService.canExportHd(req.userId),
      tierService.canExportWithoutWatermark(req.userId),
    ]);
    return success(res, { exportHd: hd, noWatermark });
})

export default { getMyTier, checkLimit, getExportPermission };
