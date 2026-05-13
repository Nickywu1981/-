/**
 * AI Gateway 监控服务 — Monitor Service
 *
 * 功能：
 * - 多维度指标聚合（模型成功率、Token消耗、成本、延迟）
 * - 限流/熔断触发计数
 * - 为 Dashboard + 告警 提供数据源
 */
import logger from '../utils/logger.js';

// ==================== 内存指标存储 ====================

const metrics = {
  // 模型维度
  byModel: {},       // modelId → { calls, success, error, tokensIn, tokensOut, cost, latencySum }
  // 用户维度
  byUser: {},        // userId → { calls, tokensIn, tokensOut, cost }
  // 时间维度（按小时分桶）
  byHour: {},        // "2026-05-13T14" → { calls, success, error, tokens, cost }
  // 限流/熔断计数
  circuitBreakerTrips: 0,
  circuitBreakerTripsByModel: {},
  rateLimitBlocks: 0,
  rateLimitBlocksByDimension: { user: 0, ip: 0, app: 0 },
  // 全局
  totalCalls: 0,
  totalSuccess: 0,
  totalError: 0,
  totalTokensIn: 0,
  totalTokensOut: 0,
  totalCost: 0,
  totalLatencySum: 0,
};

// ==================== 记录函数 ====================

/**
 * 记录一次 AI 调用
 */
export function recordCall({
  modelId, userId, status, tokensIn, tokensOut, cost, latencyMs,
}) {
  const amount = cost?.amount || 0;
  const isSuccess = status === 'success';

  // 全局
  metrics.totalCalls++;
  if (isSuccess) metrics.totalSuccess++;
  else metrics.totalError++;
  metrics.totalTokensIn += tokensIn;
  metrics.totalTokensOut += tokensOut;
  metrics.totalCost += amount;
  metrics.totalLatencySum += latencyMs || 0;

  // 模型维度
  if (!metrics.byModel[modelId]) {
    metrics.byModel[modelId] = { calls: 0, success: 0, error: 0, tokensIn: 0, tokensOut: 0, cost: 0, latencySum: 0 };
  }
  const m = metrics.byModel[modelId];
  m.calls++;
  if (isSuccess) m.success++;
  else m.error++;
  m.tokensIn += tokensIn;
  m.tokensOut += tokensOut;
  m.cost += amount;
  m.latencySum += latencyMs || 0;

  // 用户维度
  if (userId) {
    if (!metrics.byUser[userId]) {
      metrics.byUser[userId] = { calls: 0, tokensIn: 0, tokensOut: 0, cost: 0 };
    }
    metrics.byUser[userId].calls++;
    metrics.byUser[userId].tokensIn += tokensIn;
    metrics.byUser[userId].tokensOut += tokensOut;
    metrics.byUser[userId].cost += amount;
  }

  // 时间维度
  const hourKey = new Date().toISOString().slice(0, 13);
  if (!metrics.byHour[hourKey]) {
    metrics.byHour[hourKey] = { calls: 0, success: 0, error: 0, tokens: 0, cost: 0 };
  }
  metrics.byHour[hourKey].calls++;
  if (isSuccess) metrics.byHour[hourKey].success++;
  else metrics.byHour[hourKey].error++;
  metrics.byHour[hourKey].tokens += tokensIn + tokensOut;
  metrics.byHour[hourKey].cost += amount;
}

/**
 * 记录熔断器触发
 */
export function recordCircuitBreakerTrip(modelId) {
  metrics.circuitBreakerTrips++;
  metrics.circuitBreakerTripsByModel[modelId] = (metrics.circuitBreakerTripsByModel[modelId] || 0) + 1;
}

/**
 * 记录限流拦截
 */
export function recordRateLimitBlock(dimension = 'user') {
  metrics.rateLimitBlocks++;
  if (metrics.rateLimitBlocksByDimension[dimension] !== undefined) {
    metrics.rateLimitBlocksByDimension[dimension]++;
  }
}

// ==================== Dashboard 数据 ====================

/**
 * 获取 Dashboard 摘要数据
 */
export function getDashboardSummary(hours = 24) {
  const cutoff = new Date(Date.now() - hours * 3600 * 1000).toISOString().slice(0, 13);
  const recentHours = Object.entries(metrics.byHour)
    .filter(([key]) => key >= cutoff)
    .sort(([a], [b]) => a.localeCompare(b));

  const calls = recentHours.reduce((s, [, v]) => s + v.calls, 0);
  const errors = recentHours.reduce((s, [, v]) => s + v.error, 0);
  const successRate = calls > 0 ? ((calls - errors) / calls * 100).toFixed(1) : '100.0';
  const avgLatency = metrics.totalCalls > 0 ? Math.round(metrics.totalLatencySum / metrics.totalCalls) : 0;

  return {
    period: `${hours}h`,
    calls,
    successRate: parseFloat(successRate),
    avgLatencyMs: avgLatency,
    totalTokens: metrics.totalTokensIn + metrics.totalTokensOut,
    totalCost: Math.round(metrics.totalCost * 100) / 100,
    circuitBreakerTrips: metrics.circuitBreakerTrips,
    rateLimitBlocks: metrics.rateLimitBlocks,
    modelCount: Object.keys(metrics.byModel).length,
    activeUsers: Object.keys(metrics.byUser).length,
  };
}

/**
 * 获取按模型分组的数据
 */
export function getModelBreakdown() {
  return Object.entries(metrics.byModel).map(([modelId, m]) => ({
    modelId,
    calls: m.calls,
    successRate: m.calls > 0 ? ((m.success / m.calls) * 100).toFixed(1) : '0.0',
    avgLatencyMs: m.calls > 0 ? Math.round(m.latencySum / m.calls) : 0,
    tokensIn: m.tokensIn,
    tokensOut: m.tokensOut,
    cost: Math.round(m.cost * 100) / 100,
  })).sort((a, b) => b.calls - a.calls);
}

/**
 * 获取按小时的时间序列数据
 */
export function getTimeSeries(hours = 24) {
  const cutoff = new Date(Date.now() - hours * 3600 * 1000).toISOString().slice(0, 13);
  return Object.entries(metrics.byHour)
    .filter(([key]) => key >= cutoff)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, v]) => ({
      hour,
      calls: v.calls,
      success: v.success,
      error: v.error,
      tokens: v.tokens,
      cost: Math.round(v.cost * 100) / 100,
    }));
}

/**
 * 获取 Token 消耗排行（按用户）
 */
export function getTopUsers(limit = 10) {
  return Object.entries(metrics.byUser)
    .map(([userId, u]) => ({ userId, ...u }))
    .sort((a, b) => b.tokensIn + b.tokensOut - (a.tokensIn + a.tokensOut))
    .slice(0, limit);
}

export default { recordCall, recordCircuitBreakerTrip, recordRateLimitBlock, getDashboardSummary, getModelBreakdown, getTimeSeries, getTopUsers };
