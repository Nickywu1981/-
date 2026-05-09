import complianceService from '../services/complianceService.js';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export async function listTargets(_req, res) {
  try {
    return success(res, complianceService.listComplianceTargets());
  } catch (e) {
    return error(res, e.status || ERROR_CODE.INTERNAL_ERROR, e.message);
  }
}

export async function check(req, res) {
  try {
    const { platform, region, category } = req.body;
    if (!platform) return error(res, ERROR_CODE.BAD_REQUEST, '缺少必要参数：platform');
    const result = complianceService.checkCompliance({ platform, region, category });
    return success(res, result);
  } catch (e) {
    return error(res, e.status || ERROR_CODE.INTERNAL_ERROR, e.message);
  }
}

export async function getRules(req, res) {
  try {
    const { code } = req.params;
    const rules = complianceService.getPlatformCompliance(code) || complianceService.getRegionCompliance(code);
    if (!rules) return error(res, ERROR_CODE.NOT_FOUND, '未找到合规规则');
    return success(res, rules);
  } catch (e) {
    return error(res, e.status || ERROR_CODE.INTERNAL_ERROR, e.message);
  }
}
