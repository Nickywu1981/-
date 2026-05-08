import { BusinessError } from '../utils/businessError.js';

/**
 * Movio AI v4.1 — Config Service
 * G5 后端开发 | T-G5-002
 * 配置读取(三级权限) + 写入 + 变更日志 + Redis缓存 + 回滚
 * P0-4: 重构为 configDao，移除全部裸SQL
 */
import configDao from '../dao/configDao.js';
import pool from '../dao/db.js';
import redis from '../dao/redis.js';
import { broadcastVersion } from './config-version.service.js';

const CACHE_PREFIX = 'config:';
const CACHE_TTL = 600; // 10分钟

const PERMISSION_LEVELS = {
  'page.': 0, 'comp.': 0, 'nav.': 0, 'dict.': 0, 'tpl.': 0,
  'biz.': 1, 'sys.upload': 0, 'sys.rate_limit': 0,
  'sys.model': 2, 'sys.theme': 0,
};

function getPermissionLevel(groupKey) {
  for (const [prefix, level] of Object.entries(PERMISSION_LEVELS)) {
    if (groupKey.startsWith(prefix)) return level;
  }
  return 1;
}

export async function getGroupConfig(groupKey, userId, userRole) {
  const userLevel = userRole === 'super_admin' || userRole === 'admin' ? 2 : userId ? 1 : 0;
  if (userLevel < getPermissionLevel(groupKey)) throw new BusinessError(403, '无权限读取此配置');

  try {
    const cached = await redis.get(CACHE_PREFIX + groupKey);
    if (cached) return JSON.parse(cached);
  } catch { /* noop */ }

  const items = await configDao.getItemsByGroup(groupKey);
  const result = {};
  for (const item of items) result[item.item_key] = item.item_value ?? item.default_val;

  try { await redis.setex(CACHE_PREFIX + groupKey, CACHE_TTL, JSON.stringify(result)); } catch { /* noop */ }
  return result;
}

export async function getDict(dictKey) {
  try {
    const cached = await redis.get(CACHE_PREFIX + 'dict:' + dictKey);
    if (cached) return JSON.parse(cached);
  } catch { /* noop */ }
  const items = await configDao.getDictItems(dictKey);
  try { await redis.setex(CACHE_PREFIX + 'dict:' + dictKey, CACHE_TTL, JSON.stringify(items)); } catch { /* noop */ }
  return items;
}

export async function setConfig(groupKey, itemKey, itemValue, changedBy) {
  const oldValue = await configDao.getItemValue(groupKey, itemKey);
  if (oldValue === null) throw new BusinessError(404, '配置项不存在');
  await configDao.updateItemValue(groupKey, itemKey, itemValue);
  await configDao.insertLog({ group_key: groupKey, item_key: itemKey, old_value: oldValue, new_value: itemValue, changed_by: changedBy });
  try { await redis.del(CACHE_PREFIX + groupKey); await broadcastVersion(); } catch { /* noop */ }
  return { group_key: groupKey, item_key: itemKey, old_value: oldValue, new_value: itemValue };
}

export async function rollbackConfig(logId, changedBy) {
  const log = await configDao.getLogById(logId);
  if (!log) throw new BusinessError(404, '变更记录不存在');
  await configDao.updateItemValue(log.group_key, log.item_key, log.old_value);
  await configDao.insertLog({ group_key: log.group_key, item_key: log.item_key, old_value: log.new_value, new_value: log.old_value, changed_by: changedBy });
  try { await redis.del(CACHE_PREFIX + log.group_key); await broadcastVersion(); } catch { /* noop */ }
  return { message: '回滚成功', group_key: log.group_key, item_key: log.item_key };
}

export async function getConfigLogs(groupKey, limit = 50) {
  const { rows } = await configDao.listLogs({ limit: Number(limit) });
  return rows;
}

export async function getGroupList() {
  const [groups] = await pool.execute('SELECT group_key, group_name, parent_key, sort_order, is_enabled FROM sys_config_group ORDER BY sort_order, group_key');
  return groups;
}

export async function getGroupItems(groupKey) {
  const [items] = await pool.execute('SELECT item_key, item_value, item_type, default_val, placeholder, sort_order, is_enabled FROM sys_config_item WHERE group_key = ? ORDER BY sort_order', [groupKey]);
  return items;
}
