/**
 * Admin Workspace DIY Controller — 管理后台编辑工作台页面
 */
import { wrapController } from '../utils/wrapController.js';
import { success } from '../utils/response.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { getAllConfig, getConfigByKey, saveConfig, deleteConfigByKey } from '../services/siteConfigService.js';
import logger from '../utils/logger.js';

export const getAll = wrapController(async (_req, res) => {
  const rows = await getAllConfig();
  const config = {};
  for (const r of rows) config[r.config_key] = r.config_value;
  return success(res, { config, updatedAt: rows[0]?.updated_at || null });
});

export const getByKey = wrapController(async (req, res) => {
  const row = await getConfigByKey(req.params.key);
  if (!row) throw new BusinessError(ERROR_CODE.NOT_FOUND);
  return success(res, row);
});

export const update = wrapController(async (req, res) => {
  const { config_value, description } = req.body;
  const updatedBy = req.user?.username || req.user?.email || 'admin';
  await saveConfig(req.params.key, config_value, 'json', description || '');
  logger.info(`[workspace-diy] ${req.params.key} 已更新 by ${updatedBy}`);
  return success(res, { message: `${req.params.key} 已保存`, updatedBy });
});

export const reset = wrapController(async (req, res) => {
  const row = await getConfigByKey(req.params.key);
  if (!row) throw new BusinessError(ERROR_CODE.NOT_FOUND);
  await deleteConfigByKey(req.params.key);
  logger.info(`[workspace-diy] ${req.params.key} 已重置为默认值 by ${req.user?.username || 'admin'}`);
  return success(res, { message: `${req.params.key} 已重置为默认值` });
});
