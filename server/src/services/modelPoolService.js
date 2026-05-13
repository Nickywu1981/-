/**
 * 全局统一模型池 (Unified Model Pool)
 *
 * 统一管理所有类型模型：文生图、文生视频、LLM、TTS、音频
 * 支持：新增/删除/启用禁用/密钥配置/权重/熔断/灰度调度/配额
 *
 * 模型类别：
 *   image  — 文生图 (gpt-image-2, SD, 通义万象)
 *   video  — 文生视频 (Seedance, Kling, 即梦)
 *   text   — 大语言模型 (DeepSeek, Qwen, Claude, GPT)
 *   voice  — 语音合成 (EdgeTTS, CosyVoice, ElevenLabs)
 *   audio  — 音频处理 (demucs, audioSep)
 */
import * as modelConfigDao from '../dao/modelConfigDao.js';
import { BusinessError } from '../utils/businessError.js';
import { encrypt } from '../utils/crypto.js';
import logger from '../utils/logger.js';
import { ERROR_CODE } from '../constants/errorCode.js';

// ==================== 池状态缓存 ====================
let _poolCache = null;
let _poolCacheTs = 0;
const CACHE_TTL_MS = 30_000; // 30s

// ==================== 灰度权重 ====================

function _selectByWeight(models) {
  if (models.length === 0) return null;
  const enabled = models.filter(m => m.pool_enabled !== 0);
  if (enabled.length === 0) return null;

  // 灰度百分比模型 (gray_percent > 0)
  const grayModels = enabled.filter(m => (m.gray_percent || 0) > 0);
  if (grayModels.length > 0) {
    const roll = Math.random() * 100;
    let cumulative = 0;
    for (const m of grayModels) {
      cumulative += m.gray_percent || 0;
      if (roll <= cumulative) return m;
    }
  }

  // A/B 实验分流 (ab_group + ab_percent)
  const abModels = enabled.filter(m => m.ab_group && (m.ab_percent || 0) > 0);
  if (abModels.length > 0) {
    const groups = new Map();
    for (const m of abModels) {
      if (!groups.has(m.ab_group)) groups.set(m.ab_group, []);
      groups.get(m.ab_group).push(m);
    }
    const groupNames = [...groups.keys()];
    const totalAbPercent = groupNames.reduce((sum, g) => sum + (groups.get(g)[0]?.ab_percent || 0), 0);
    const roll = Math.random() * (totalAbPercent || 100);
    let cumulative = 0;
    for (const g of groupNames) {
      cumulative += groups.get(g)[0]?.ab_percent || 0;
      if (roll <= cumulative) {
        return _selectByWeight(groups.get(g));
      }
    }
  }

  // 权重轮询
  const totalWeight = enabled.reduce((sum, m) => sum + (m.pool_weight ?? 1), 0);
  let roll = Math.random() * totalWeight;
  for (const m of enabled) {
    roll -= (m.pool_weight ?? 1);
    if (roll <= 0) return m;
  }
  return enabled[0];
}

function _selectByCategory(models, category) {
  const catModels = models.filter(m => m.category === category);
  return _selectByWeight(catModels);
}

function _selectBest(models, category, taskType) {
  const catModels = models.filter(m => m.category === category);
  if (catModels.length === 0) return null;

  // 优先匹配 taskType
  const taskMatch = catModels.filter(m => m.task_type === taskType);
  if (taskMatch.length > 0) return _selectByWeight(taskMatch);

  return _selectByWeight(catModels);
}

// ==================== 池 CRUD ====================

export async function refreshPool() {
  try {
    const rows = await modelConfigDao.listAll(true);
    _poolCache = rows;
    _poolCacheTs = Date.now();
    logger.info(`[ModelPool] Refreshed ${rows.length} models`);
    return _poolCache;
  } catch (err) {
    logger.error('[ModelPool] Refresh failed:', err.message);
    return _poolCache || [];
  }
}

export async function getPool() {
  if (!_poolCache || Date.now() - _poolCacheTs > CACHE_TTL_MS) {
    await refreshPool();
  }
  return _poolCache;
}

export async function listByCategory(category) {
  const pool = await getPool();
  return pool.filter(m => m.category === category);
}

export async function listEnabledByCategory(category) {
  const pool = await getPool();
  return pool.filter(m => m.category === category && m.enabled === 1);
}

// ==================== 模型注册/管理 ====================

export async function registerModel(data) {
  const existing = await modelConfigDao.getByKey(data.model_key);
  if (existing) throw new BusinessError(ERROR_CODE.RESOURCE_DUPLICATE);

  const { api_key, ...rest } = data;
  const record = await modelConfigDao.create({
    ...rest,
    api_key_enc: encrypt(api_key),
    pool_enabled: data.pool_enabled ?? 1,
    pool_weight: data.pool_weight ?? 1,
    gray_percent: data.gray_percent || 0,
    quota_daily: data.quota_daily || 0,
    quota_tenant: data.quota_tenant || 0,
  });

  await refreshPool();
  return record;
}

export async function updateModel(modelKey, data) {
  const { api_key, ...rest } = data;
  const updateData = { ...rest };
  if (api_key) updateData.api_key_enc = encrypt(api_key);

  const result = await modelConfigDao.update(modelKey, updateData);
  if (!result) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);

  await refreshPool();
  return result;
}

export async function removeModel(modelKey) {
  const ok = await modelConfigDao.remove(modelKey);
  if (!ok) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  await refreshPool();
  return true;
}

export async function toggleModel(modelKey, enabled) {
  const ok = await modelConfigDao.toggle(modelKey, enabled);
  if (!ok) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  await refreshPool();
  return { model_key: modelKey, enabled };
}

export async function setGrayPercent(modelKey, percent) {
  const result = await modelConfigDao.update(modelKey, { gray_percent: percent });
  await refreshPool();
  return result;
}

// ==================== 智能选择 (自动模式) ====================

/**
 * 自动模式下为每一步选择最优模型
 */
export async function autoSelect(category, taskType, options = {}) {
  const pool = await getPool();
  const model = _selectBest(pool, category, taskType);

  if (!model) {
    throw new BusinessError(ERROR_CODE.INTERNAL_ERROR, `No ${category} models available`);
  }

  logger.info('[ModelPool] Auto-selected', {
    category, taskType, model: model.model_key, weight: model.pool_weight,
  });

  return {
    model_key: model.model_key,
    display_name: model.display_name,
    vendor: model.vendor,
    category: model.category,
    endpoint: model.endpoint,
    model_id: model.model_id,
    max_tokens: model.max_tokens,
  };
}

/**
 * 获取指定模型配置 (自定义模式)
 */
export async function getModelConfig(modelKey) {
  const pool = await getPool();
  const model = pool.find(m => m.model_key === modelKey);
  if (!model) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND, `模型 ${modelKey} 不存在`);
  if (!model.enabled) throw new BusinessError(ERROR_CODE.PARAM_INVALID, `Model ${modelKey} disabled`);
  return model;
}

// ==================== 配额控制 ====================

const _quotaDaily = new Map(); // modelKey_date → count
const _quotaTenant = new Map(); // modelKey_tenantId_date → count

function _todayKey(prefix, modelKey, id = '') {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return id ? `${prefix}_${modelKey}_${id}_${date}` : `${prefix}_${modelKey}_${date}`;
}

export async function checkQuota(modelKey, userId) {
  const pool = await getPool();
  const model = pool.find(m => m.model_key === modelKey);
  if (!model) return { allowed: false, reason: '模型不存在' };

  const quotaDaily = model.quota_daily || 0;
  const quotaTenant = model.quota_tenant || 0;

  // 检查每日总配额
  if (quotaDaily > 0) {
    const key = _todayKey('daily', modelKey);
    const used = _quotaDaily.get(key) || 0;
    if (used >= quotaDaily) return { allowed: false, reason: `模型 ${modelKey} 已达每日配额 ${quotaDaily}`, used, quota: quotaDaily };
  }

  // 检查每租户配额
  if (quotaTenant > 0 && userId) {
    const key = _todayKey('tenant', modelKey, userId);
    const used = _quotaTenant.get(key) || 0;
    if (used >= quotaTenant) return { allowed: false, reason: `租户 ${userId} 对模型 ${modelKey} 已达每日配额 ${quotaTenant}`, used, quota: quotaTenant };
  }

  return { allowed: true };
}

export function consumeQuota(modelKey, userId) {
  const dailyKey = _todayKey('daily', modelKey);
  _quotaDaily.set(dailyKey, (_quotaDaily.get(dailyKey) || 0) + 1);

  if (userId) {
    const tenantKey = _todayKey('tenant', modelKey, userId);
    _quotaTenant.set(tenantKey, (_quotaTenant.get(tenantKey) || 0) + 1);
  }
}

export function getQuotaUsage(modelKey, userId) {
  return {
    daily: _quotaDaily.get(_todayKey('daily', modelKey)) || 0,
    tenant: userId ? (_quotaTenant.get(_todayKey('tenant', modelKey, userId)) || 0) : 0,
  };
}

// ==================== 统计 ====================

export async function getPoolStats() {
  const pool = await getPool();
  const stats = {
    total: pool.length,
    enabled: pool.filter(m => m.enabled === 1).length,
    byCategory: {},
  };

  for (const m of pool) {
    if (!stats.byCategory[m.category]) {
      stats.byCategory[m.category] = { total: 0, enabled: 0, models: [] };
    }
    stats.byCategory[m.category].total++;
    if (m.enabled === 1) stats.byCategory[m.category].enabled++;
    stats.byCategory[m.category].models.push({
      key: m.model_key,
      name: m.display_name,
      vendor: m.vendor,
      weight: m.pool_weight,
      gray: m.gray_percent,
    });
  }

  return stats;
}

export async function getAbStats(days = 7) {
  const pool = await getPool();
  const abGroups = new Map();

  for (const m of pool) {
    if (m.ab_group) {
      if (!abGroups.has(m.ab_group)) abGroups.set(m.ab_group, []);
      abGroups.get(m.ab_group).push(m.model_key);
    }
  }

  if (abGroups.size === 0) return { groups: [], message: '未配置 A/B 实验' };

  const rows = [];
  for (const [group, modelKeys] of abGroups) {
    let totalCalls = 0, successCount = 0, totalLatency = 0;
    for (const key of modelKeys) {
      const stats = await modelConfigDao.getCallStats(key, days);
      totalCalls += (stats.total_calls || 0);
      successCount += (stats.success_count || 0);
      totalLatency += ((stats.avg_latency || 0) * (stats.total_calls || 0));
    }
    rows.push({
      group,
      models: modelKeys,
      calls: totalCalls,
      successRate: totalCalls > 0 ? Math.round((successCount / totalCalls) * 10000) / 10000 : 0,
      avgMs: totalCalls > 0 ? Math.round(totalLatency / totalCalls) : 0,
    });
  }

  return { days, groups: rows };
}

export default {
  getPool, refreshPool, listByCategory, listEnabledByCategory,
  registerModel, updateModel, removeModel, toggleModel, setGrayPercent,
  autoSelect, getModelConfig, checkQuota, consumeQuota, getQuotaUsage, getPoolStats, getAbStats,
};
