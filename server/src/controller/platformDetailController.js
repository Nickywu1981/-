import { wrapController } from '../utils/wrapController.js';
import { BusinessError } from '../utils/businessError.js';
import platformDetailService from '../services/platformDetailService.js';
import { success } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export const listAllPlatforms = wrapController(async (_req, res) => {
    const platforms = platformDetailService.listAllPlatforms();
    return success(res, platforms);
});

export const getPlatformConfig = wrapController(async (req, res) => {
    const config = platformDetailService.getPlatformConfig(req.params.code);
    if (!config) throw new BusinessError(ERROR_CODE.NOT_FOUND, '平台不存在');
    return success(res, config);
});

export const getPlatformsByRegion = wrapController(async (req, res) => {
    const { region = 'cn' } = req.query;
    const platforms = platformDetailService.getPlatformsByRegion(region);
    return success(res, platforms);
});
