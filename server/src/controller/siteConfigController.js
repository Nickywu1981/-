import { getAllConfig, getPublicConfigMap, getConfigByKey, saveConfig, deleteConfig } from '../services/siteConfigService.js';
import { success, error } from '../utils/response.js';

// GET /api/site-config/public - no auth required
export const getPublicSiteConfig = async (req, res) => {
  try {
    const map = await getPublicConfigMap();
    success(res, map);
  } catch (e) { error(res, 'Failed to load site config', 500); }
};

// GET /api/admin/site-config - admin only
export const listAllConfig = async (req, res) => {
  try {
    const rows = await getAllConfig();
    success(res, rows);
  } catch (e) { error(res, 'Failed to load config', 500); }
};

// POST /api/admin/site-config - admin only
export const createConfig = async (req, res) => {
  try {
    const { key, value, type, description } = req.body;
    if (!key || value === undefined) return error(res, 'key and value required', 400);
    await saveConfig(key, typeof value === 'object' ? JSON.stringify(value) : String(value), type || 'text', description || '');
    success(res, { key }, 'Config created');
  } catch (e) { error(res, 'Failed to create config', 500); }
};

// PUT /api/admin/site-config/:key - admin only
export const updateConfig = async (req, res) => {
  try {
    const { key } = req.params;
    const { value, type, description } = req.body;
    if (!key || value === undefined) return error(res, 'key and value required', 400);
    await saveConfig(key, typeof value === 'object' ? JSON.stringify(value) : String(value), type || 'text', description || '');
    success(res, { key }, 'Config updated');
  } catch (e) { error(res, 'Failed to update config', 500); }
};

// DELETE /api/admin/site-config/:id - admin only
export const removeConfig = async (req, res) => {
  try {
    const affected = await deleteConfig(Number(req.params.id));
    if (!affected) return error(res, 'Not found', 404);
    success(res, null, 'Config deleted');
  } catch (e) { error(res, 'Failed to delete config', 500); }
};
