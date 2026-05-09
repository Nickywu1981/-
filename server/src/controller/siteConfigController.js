import { getAllConfig, getPublicConfigMap, saveConfig, deleteConfig } from '../services/siteConfigService.js';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

// GET /api/site-config/public - no auth required
export const getPublicSiteConfig = async (req, res) => {
  try {
    const map = await getPublicConfigMap();
    success(res, map);
  } catch (err) { error(res, err.status || 500, err.message || 'Failed to load site config'); }
};

// GET /api/admin/site-config - admin only
export const listAllConfig = async (req, res) => {
  try {
    const rows = await getAllConfig();
    success(res, rows);
  } catch (err) { error(res, err.status || 500, err.message || 'Failed to load config'); }
};

// POST /api/admin/site-config - admin only
export const createConfig = async (req, res) => {
  try {
    const { key, value, type, description } = req.body;
    if (!key || value === undefined) return error(res, ERROR_CODE.BAD_REQUEST, 'key and value required');
    await saveConfig(key, typeof value === 'object' ? JSON.stringify(value) : String(value), type || 'text', description || '');
    success(res, { key }, 'Config created');
  } catch (err) { error(res, err.status || 500, err.message || 'Failed to create config'); }
};

// PUT /api/admin/site-config/:key - admin only
export const updateConfig = async (req, res) => {
  try {
    const { key } = req.params;
    const { value, type, description } = req.body;
    if (!key || value === undefined) return error(res, ERROR_CODE.BAD_REQUEST, 'key and value required');
    await saveConfig(key, typeof value === 'object' ? JSON.stringify(value) : String(value), type || 'text', description || '');
    success(res, { key }, 'Config updated');
  } catch (err) { error(res, err.status || 500, err.message || 'Failed to update config'); }
};

// DELETE /api/admin/site-config/:id - admin only
export const removeConfig = async (req, res) => {
  try {
    const affected = await deleteConfig(Number(req.params.id));
    if (!affected) return error(res, ERROR_CODE.NOT_FOUND, 'Not found');
    success(res, null, 'Config deleted');
  } catch (err) { error(res, err.status || 500, err.message || 'Failed to delete config'); }
};
