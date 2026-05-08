import { getAll, getByKey, getByKeys, upsert, remove } from '../dao/siteConfigDao.js';

export const getAllConfig = async () => getAll();

export const getPublicConfig = async () => {
  const keys = ['site_name', 'site_logo', 'hero_title', 'hero_subtitle', 'hero_cta', 'footer_text', 'features', 'pricing', 'nav_links', 'workspace_tools'];
  return getByKeys(keys);
};

/** 以 key-value map 格式返回公开配置 */
export const getPublicConfigMap = async () => {
  const rows = await getPublicConfig();
  const map = {};
  rows.forEach(r => { map[r.config_key] = r.config_type === 'json' ? JSON.parse(r.config_value) : r.config_value; });
  return map;
};

export const getConfigByKey = async (key) => getByKey(key);

export const saveConfig = async (key, value, type, description) => upsert(key, value, type, description);

export const deleteConfig = async (id) => remove(id);
