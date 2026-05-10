import { wrapController } from '../utils/wrapController.js';
import complianceService from '../services/complianceService.js';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export const listTargets = wrapController(async (_req, res) => {
    return success(res, complianceService.listComplianceTargets());
})

export const check = wrapController(async (req, res) => {
    const { platform, region, category } = req.body;
    if (!platform) return error(res, ERROR_CODE.BAD_REQUEST, '缺少必要参数：platform');
    const result = complianceService.checkCompliance({ platform, region, category });
    return success(res, result);
})

export const getRules = wrapController(async (req, res) => {
    const { code } = req.params;
    const rules = complianceService.getPlatformCompliance(code) || complianceService.getRegionCompliance(code);
    if (!rules) return error(res, ERROR_CODE.NOT_FOUND, '未找到合规规则');
    return success(res, rules);
})
