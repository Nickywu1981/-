import { wrapController } from '../utils/wrapController.js';
import { BusinessError } from '../utils/businessError.js';
import * as geoRulesService from '../services/geoRulesService.js';
import { success } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export const listRules = wrapController(async (_req, res) => {
  const rows = await geoRulesService.listRules();
  success(res, rows);
});

export const getRule = wrapController(async (req, res) => {
  try {
    const rule = await geoRulesService.getRule(Number(req.params.id));
    success(res, rule);
  } catch (err) {
    throw new BusinessError(err.status || ERROR_CODE.NOT_FOUND, err.message);
  }
});

export const createRule = wrapController(async (req, res) => {
  const id = await geoRulesService.createRule(req.body);
  success(res, id, 'GEO rule created');
});

export const updateRule = wrapController(async (req, res) => {
  try {
    await geoRulesService.updateRule(Number(req.params.id), req.body);
    success(res, null, 'GEO rule updated');
  } catch (err) {
    throw new BusinessError(err.status || ERROR_CODE.NOT_FOUND, err.message);
  }
});

export const deleteRule = wrapController(async (req, res) => {
  try {
    await geoRulesService.deleteRule(Number(req.params.id));
    success(res, null, 'GEO rule deleted');
  } catch (err) {
    throw new BusinessError(err.status || ERROR_CODE.NOT_FOUND, err.message);
  }
});
