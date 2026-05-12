import { wrapController } from '../utils/wrapController.js';
import * as geoRulesService from '../services/geoRulesService.js';

export const listRules = wrapController(async () => {
  return await geoRulesService.listRules();
});

export const getRule = wrapController(async (req) => {
  return await geoRulesService.getRule(Number(req.params.id));
});

export const createRule = wrapController(async (req) => {
  const id = await geoRulesService.createRule(req.body);
  return { id };
});

export const updateRule = wrapController(async (req) => {
  return await geoRulesService.updateRule(Number(req.params.id), req.body);
});

export const deleteRule = wrapController(async (req) => {
  return await geoRulesService.deleteRule(Number(req.params.id));
});
