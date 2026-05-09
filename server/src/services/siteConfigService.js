import { getAll, getByKey, getByKeys, upsert, remove } from '../dao/siteConfigDao.js';
import { cacheGet, cacheSet, cacheDel } from '../dao/redis.js';
import logger from '../utils/logger.js';

const CACHE_PREFIX = 'siteconfig:';
const CACHE_TTL = 600; // 10分钟

export const getAllConfig = async () => getAll();

export const getPublicConfig = async () => {
  const keys = ['site_name', 'site_logo', 'hero_title', 'hero_subtitle', 'hero_cta', 'footer_text', 'features', 'pricing', 'nav_links', 'workspace_tools', 'workspace_nav', 'workspace_cards', 'workspace_assistant', 'workspace_workflow'];
  return getByKeys(keys);
};

/** 以 key-value map 格式返回公开配置，带 Redis 缓存 */
export const getPublicConfigMap = async () => {
  try {
    const cached = await cacheGet(CACHE_PREFIX + 'public');
    if (cached) return cached;
  } catch { /* noop */ }

  const rows = await getPublicConfig();
  const map = {};
  rows.forEach(r => {
    if (r.config_type === 'json') {
      try { map[r.config_key] = JSON.parse(r.config_value); } catch { map[r.config_key] = r.config_value; }
    } else {
      map[r.config_key] = r.config_value;
    }
  });

  try { await cacheSet(CACHE_PREFIX + 'public', map, CACHE_TTL); } catch { /* noop */ }
  return map;
};

export const getConfigByKey = async (key) => getByKey(key);

export const saveConfig = async (key, value, type, description) => upsert(key, value, type, description);

export const deleteConfig = async (id) => remove(id);

/** 清除公开配置缓存（写操作后调用） */
export const clearPublicCache = async () => {
  try { await cacheDel(CACHE_PREFIX + 'public'); } catch { /* noop */ }
};
