/**
 * Movio AI v4.1 — Compliance Controller
 */
import { wrapController } from '../utils/wrapController.js';
import { success } from '../utils/response.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import * as complianceService from '../services/complianceService.js';

export const getTargets = wrapController(async (_req, res) => {
  const targets = complianceService.listComplianceTargets();
  return success(res, targets);
});

export const checkCompliance = wrapController(async (req, res) => {
  const result = complianceService.checkCompliance(req.validated);
  return success(res, result);
});

export const getRules = wrapController(async (req, res) => {
  const rules = complianceService.getPlatformCompliance(req.params.code)
    || complianceService.getRegionCompliance(req.params.code);
  if (!rules) throw new BusinessError(ERROR_CODE.NOT_FOUND, '未找到合规规则');
  return success(res, rules);
});
