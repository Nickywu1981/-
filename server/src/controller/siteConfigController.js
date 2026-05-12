import { wrapController } from '../utils/wrapController.js';
import { BusinessError } from '../utils/businessError.js';
import { getAllConfig, getPublicConfigMap, saveConfig, deleteConfig, clearPublicCache } from '../services/siteConfigService.js';
import { success } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { broadcastVersion } from '../services/config-version.service.js';
import logger from '../utils/logger.js';

const getUserId = (req) => req.user?.id || req.user?.userId || null;

export const getPublicSiteConfig = wrapController(async (req, res) => {
  const map = await getPublicConfigMap();
  success(res, map);
});

export const listAllConfig = wrapController(async (req, res) => {
  const rows = await getAllConfig();
  success(res, rows);
});

export const createConfig = wrapController(async (req, res) => {
  const { key, value, type, description } = req.body;
  if (!key || value === undefined) throw new BusinessError(ERROR_CODE.BAD_REQUEST, 'key and value required');
  await saveConfig(key, typeof value === 'object' ? JSON.stringify(value) : String(value), type || 'text', description || '', getUserId(req));
  await clearPublicCache();
  broadcastVersion().catch(err => { logger.warn('[siteConfig] broadcastVersion failed', err.message); });
  success(res, { key }, 'Config created');
});

export const updateConfig = wrapController(async (req, res) => {
  const { key } = req.params;
  const { value, type, description } = req.body;
  if (!key || value === undefined) throw new BusinessError(ERROR_CODE.BAD_REQUEST, 'key and value required');
  await saveConfig(key, typeof value === 'object' ? JSON.stringify(value) : String(value), type || 'text', description || '', getUserId(req));
  await clearPublicCache();
  broadcastVersion().catch(err => { logger.warn('[siteConfig] broadcastVersion failed', err.message); });
  success(res, { key }, 'Config updated');
});

export const removeConfig = wrapController(async (req, res) => {
  const affected = await deleteConfig(Number(req.params.id), getUserId(req));
  if (!affected) throw new BusinessError(ERROR_CODE.NOT_FOUND, 'Not found');
  await clearPublicCache();
  broadcastVersion().catch(err => { logger.warn('[siteConfig] broadcastVersion failed', err.message); });
  success(res, null, 'Config deleted');
});
