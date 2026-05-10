import { getAll, getByKey, getByKeys, upsert, remove, removeByKey } from '../dao/siteConfigDao.js';
import { insertLog, getLogsByKey } from '../dao/siteConfigLogDao.js';
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
  } catch (e) {
    logger.warn('[SiteConfig] Redis 缓存读取失败', { error: e.message });
  }

  const rows = await getPublicConfig();
  const map = {};
  rows.forEach(r => {
    if (r.config_type === 'json') {
      try { map[r.config_key] = JSON.parse(r.config_value); } catch { map[r.config_key] = r.config_value; }
    } else {
      map[r.config_key] = r.config_value;
    }
  });

  try { await cacheSet(CACHE_PREFIX + 'public', map, CACHE_TTL); } catch (e) { logger.warn('[SiteConfig] Redis 缓存写入失败', { error: e.message }); }
  return map;
};

export const getConfigByKey = async (key) => getByKey(key);

export const saveConfig = async (key, value, type, description, userId) => {
  const old = await getByKey(key);
  const oldValue = old?.config_value ?? null;
  await upsert(key, value, type, description);
  try {
    await insertLog({
      configKey: key,
      oldValue,
      newValue: value,
      changedBy: userId || null,
    });
  } catch (err) { logger.warn('[SiteConfig] audit log insert failed', { key, error: err.message }); }
};

export const deleteConfig = async (id, userId) => {
  const row = await getByKey(id);
  const result = await remove(id);
  if (result && row) {
    try {
      await insertLog({
        configKey: typeof row === 'object' ? row.config_key : id,
        oldValue: typeof row === 'object' ? row.config_value : null,
        newValue: null,
        changedBy: userId || null,
      });
    } catch (err) { logger.warn('[SiteConfig] audit log insert failed', { id, error: err.message }); }
  }
  return result;
};

export const deleteConfigByKey = async (key, userId) => {
  const old = await getByKey(key);
  const result = await removeByKey(key);
  if (result && old) {
    try {
      await insertLog({ configKey: key, oldValue: old.config_value, newValue: null, changedBy: userId || null });
    } catch (err) { logger.warn('[SiteConfig] audit log insert failed', { key, error: err.message }); }
  }
  return result;
};

/** 清除公开配置缓存（写操作后调用） */
export const clearPublicCache = async () => {
  try { await cacheDel(CACHE_PREFIX + 'public'); } catch (e) { logger.warn('[SiteConfig] Redis 缓存清除失败', { error: e.message }); }
};

export const getConfigLogs = async (key, limit) => getLogsByKey(key, limit);
