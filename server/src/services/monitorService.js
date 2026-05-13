/**
 * AI Gateway 监控服务 — Monitor Service
 *
 * 功能：
 * - 多维度指标聚合（模型成功率、Token消耗、成本、延迟）
 * - 限流/熔断触发计数
 * - 为 Dashboard + 告警 提供数据源
 * - Redis 持久化快照（进程重启不丢失）
 */
import logger from '../utils/logger.js';
import { cacheGet, cacheSet } from '../dao/redis.js';

const REDIS_SNAPSHOT_KEY = 'ai:monitor:snapshot';
const SNAPSHOT_INTERVAL_MS = 60_000; // 每 60 秒持久化一次

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

// ==================== Redis 持久化 ====================

let _restored = false;

/**
 * 从 Redis 恢复上次快照
 */
async function restoreFromRedis() {
  if (_restored) return;
  try {
    const snapshot = await cacheGet(REDIS_SNAPSHOT_KEY);
    if (snapshot && typeof snapshot === 'object') {
      // 仅恢复核心指标：用 Math.max 避免覆盖启动后已累加的增量数据
      if (snapshot.totalCalls) metrics.totalCalls = Math.max(metrics.totalCalls, snapshot.totalCalls);
      if (snapshot.totalSuccess) metrics.totalSuccess = Math.max(metrics.totalSuccess, snapshot.totalSuccess);
      if (snapshot.totalError) metrics.totalError = Math.max(metrics.totalError, snapshot.totalError);
      if (snapshot.totalTokensIn) metrics.totalTokensIn = Math.max(metrics.totalTokensIn, snapshot.totalTokensIn);
      if (snapshot.totalTokensOut) metrics.totalTokensOut = Math.max(metrics.totalTokensOut, snapshot.totalTokensOut);
      if (snapshot.totalCost) metrics.totalCost = Math.max(metrics.totalCost, snapshot.totalCost);
      if (snapshot.byModel && typeof snapshot.byModel === 'object') {
        Object.assign(metrics.byModel, snapshot.byModel);
      }
      if (snapshot.byUser && typeof snapshot.byUser === 'object') {
        Object.assign(metrics.byUser, snapshot.byUser);
      }
      logger.info('[Monitor] Redis 快照恢复完成', {
        totalCalls: metrics.totalCalls,
        models: Object.keys(metrics.byModel).length,
        users: Object.keys(metrics.byUser).length,
      });
    }
  } catch (e) {
    logger.warn(`[Monitor] Redis 快照恢复失败: ${e.message}`);
    // 恢复失败不标记 _restored，下次调用可重试
    return;
  }
  _restored = true;
}

/**
 * 持久化当前指标到 Redis
 */
async function saveSnapshot() {
  try {
    const snapshot = {
      timestamp: Date.now(),
      totalCalls: metrics.totalCalls,
      totalSuccess: metrics.totalSuccess,
      totalError: metrics.totalError,
      totalTokensIn: metrics.totalTokensIn,
      totalTokensOut: metrics.totalTokensOut,
      totalCost: metrics.totalCost,
      byModel: metrics.byModel,
      byUser: metrics.byUser,
    };
    await cacheSet(REDIS_SNAPSHOT_KEY, snapshot, 7200); // TTL 2 小时
  } catch (e) {
    logger.warn(`[Monitor] Redis 快照保存失败: ${e.message}`);
  }
}

// 启动时自动恢复
restoreFromRedis();

// 定时持久化快照
const _snapshotTimer = setInterval(saveSnapshot, SNAPSHOT_INTERVAL_MS).unref();

export default { recordCall, recordCircuitBreakerTrip, recordRateLimitBlock, getDashboardSummary, getModelBreakdown, getTimeSeries, getTopUsers, restoreFromRedis, saveSnapshot };
