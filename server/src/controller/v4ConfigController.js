/**
 * Movio AI v4.1 — Config Controller
 */
import { wrapController } from '../utils/wrapController.js';
import { success } from '../utils/response.js';
import * as configService from '../services/config.service.js';

export const getGroupConfig = wrapController(async (req, res) => {
  const config = await configService.getGroupConfig(
    req.params.group,
    req.user?.id || null,
    req.user?.role || null,
  );
  return success(res, config);
});

export const getDict = wrapController(async (req, res) => {
  const dict = await configService.getDict(req.params.dictKey);
  return success(res, dict);
});

export const getGroupList = wrapController(async (req, res) => {
  const groups = await configService.getGroupList();
  return success(res, groups);
});

export const getGroupItems = wrapController(async (req, res) => {
  const items = await configService.getGroupItems(req.params.groupKey);
  return success(res, items);
});

export const setConfig = wrapController(async (req, res) => {
  const { group_key, item_key, item_value } = req.validated;
  const result = await configService.setConfig(group_key, item_key, item_value, req.user.id);
  return success(res, result, '配置已更新');
});

export const rollbackConfig = wrapController(async (req, res) => {
  const { log_id } = req.validated;
  const result = await configService.rollbackConfig(log_id, req.user.id);
  return success(res, result, '配置已回滚');
});

export const getConfigLogs = wrapController(async (req, res) => {
  const logs = await configService.getConfigLogs(req.params.group);
  return success(res, logs);
});

export const verifySeed = wrapController(async (req, res) => {
  const { validateSeed } = await import('../utils/seed-validator.js');
  const pool = (await import('../dao/db.js')).default;
  const result = await validateSeed(pool);
  return success(res, result);
});
