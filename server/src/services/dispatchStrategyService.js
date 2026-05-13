/**
 * 多模型调度策略增强服务 — Dispatch Strategies
 *
 * 功能：
 * 1. 加权轮询负载均衡（按成本/延迟/负载）
 * 2. 金丝雀灰度发布（新模型按流量百分比上线）
 * 3. 多租户配额隔离
 * 4. 自动降级链管理
 */
import logger from '../utils/logger.js';

// ==================== 1. 加权轮询 ====================

// 模型权重（可动态配置）
const modelWeights = new Map();

/**
 * 设置模型权重（用于负载均衡）
 * @param {string} modelId
 * @param {number} weight — 0-100
 * @param {'cost'|'latency'|'manual'} basis
 */
export function setModelWeight(modelId, weight, basis = 'manual') {
  modelWeights.set(modelId, { weight, basis, updatedAt: Date.now() });
}

/**
 * 加权轮询选模型
 * @param {string[]} candidates — 候选模型列表
 * @param {object} [stats] — 实时统计数据（延迟等）
 * @returns {string} 选中的模型
 */
export function weightedRoundRobin(candidates, stats = {}) {
  if (!candidates || candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const scored = candidates.map(id => {
    const w = modelWeights.get(id);
    let score = 50; // 默认权重

    if (w) {
      score = w.weight;
    } else {
      // 自动评分：优先低成本、低延迟模型
      const modelStats = stats[id];
      if (modelStats) {
        const latencyScore = Math.max(0, 100 - (modelStats.avgLatencyMs || 500) / 10);
        const costBonus = modelStats.costLevel === 'low' ? 20 : modelStats.costLevel === 'medium' ? 10 : 0;
        score = Math.round(latencyScore * 0.7 + costBonus * 0.3);
      }
    }

    return { modelId: id, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // 加权随机
  const totalWeight = scored.reduce((s, m) => s + m.score, 0);
  let random = Math.random() * totalWeight;

  for (const m of scored) {
    random -= m.score;
    if (random <= 0) return m.modelId;
  }

  return scored[0].modelId;
}

// ==================== 2. 灰度发布 ====================

const canaryConfigs = new Map();

/**
 * 设置金丝雀灰度发布配置
 * @param {string} stableModel — 稳定版模型 ID
 * @param {string} canaryModel — 新模型 ID
 * @param {number} trafficPercent — 新模型流量占比 (0-100)
 */
export function setCanaryConfig(stableModel, canaryModel, trafficPercent) {
  canaryConfigs.set(stableModel, { canaryModel, trafficPercent, startTime: Date.now() });
  logger.info(`[DispatchStrategy] 金丝雀发布: ${stableModel} → ${canaryModel} (${trafficPercent}%)`);
}

/**
 * 根据灰度配置选择模型
 * @param {string} requestedModel — 请求的目标模型
 * @returns {string} 实际使用的模型
 */
export function canarySelect(requestedModel) {
  const config = canaryConfigs.get(requestedModel);
  if (!config) return requestedModel;

  // 按流量百分比路由
  if (Math.random() * 100 < config.trafficPercent) {
    return config.canaryModel;
  }
  return requestedModel;
}

/**
 * 升级灰度：逐步增加新模型流量
 */
export function promoteCanary(stableModel, incrementPercent = 10) {
  const config = canaryConfigs.get(stableModel);
  if (!config) return null;

  config.trafficPercent = Math.min(100, config.trafficPercent + incrementPercent);
  logger.info(`[DispatchStrategy] 金丝雀升级: ${stableModel} → ${config.canaryModel} (${config.trafficPercent}%)`);

  if (config.trafficPercent >= 100) {
    logger.info(`[DispatchStrategy] 金丝雀完成: ${config.canaryModel} 全量上线`);
    canaryConfigs.delete(stableModel);
  }

  return config;
}

/**
 * 回滚灰度
 */
export function rollbackCanary(stableModel) {
  canaryConfigs.delete(stableModel);
  logger.info(`[DispatchStrategy] 金丝雀回滚: ${stableModel}`);
}

// ==================== 3. 多租户隔离 ====================

const tenantQuotas = new Map();

/**
 * 设置租户配额
 */
export function setTenantQuota(tenantId, { maxQPS, maxTokensPerHour, allowedModels }) {
  tenantQuotas.set(tenantId, {
    maxQPS: maxQPS || 10,
    maxTokensPerHour: maxTokensPerHour || 100000,
    allowedModels: allowedModels || '*',
    usage: { qps: 0, tokensThisHour: 0, hourStart: Date.now() },
  });
  logger.info(`[DispatchStrategy] 租户配额已设置: tenant=${tenantId}`);
}

/**
 * 检查租户配额
 */
export function checkTenantQuota(tenantId, tokensEstimate = 0) {
  if (!tenantId) return { allowed: true };

  const quota = tenantQuotas.get(tenantId);
  if (!quota) return { allowed: true }; // 未配置默认放行

  const now = Date.now();

  // 重置小时窗口
  if (now - quota.usage.hourStart > 3600000) {
    quota.usage.tokensThisHour = 0;
    quota.usage.hourStart = now;
  }

  // QPS 检查
  if (quota.usage.qps >= quota.maxQPS) {
    return { allowed: false, reason: `租户 QPS 超限 (${quota.maxQPS})` };
  }

  // Token 检查
  if (quota.usage.tokensThisHour + tokensEstimate > quota.maxTokensPerHour) {
    return { allowed: false, reason: `租户 Token 配额不足 (${quota.maxTokensPerHour}/h)` };
  }

  quota.usage.qps++;
  setTimeout(() => { quota.usage.qps = Math.max(0, quota.usage.qps - 1); }, 1000);

  return { allowed: true };
}

/**
 * 更新租户 Token 消耗
 */
export function consumeTenantTokens(tenantId, tokens) {
  const quota = tenantQuotas.get(tenantId);
  if (quota) {
    quota.usage.tokensThisHour += tokens;
  }
}

// ==================== 4. 降级链管理 ====================

const degradationChains = new Map();

/**
 * 注册降级链
 */
export function setDegradationChain(modelId, fallbackModels) {
  degradationChains.set(modelId, fallbackModels);
}

/**
 * 获取降级链
 */
export function getDegradationChain(modelId) {
  return degradationChains.get(modelId) || [];
}

/**
 * 获取完整的降级路径（递归展开多层降级）
 */
export function getDegradationPath(modelId, maxDepth = 3) {
  const path = [modelId];
  let current = modelId;
  for (let i = 0; i < maxDepth; i++) {
    const chain = degradationChains.get(current);
    if (!chain || chain.length === 0) break;
    current = chain[0]; // 取第一个备选
    path.push(current);
  }
  return path;
}

export default {
  weightedRoundRobin, setModelWeight,
  setCanaryConfig, canarySelect, promoteCanary, rollbackCanary,
  setTenantQuota, checkTenantQuota, consumeTenantTokens,
  setDegradationChain, getDegradationChain, getDegradationPath,
};
