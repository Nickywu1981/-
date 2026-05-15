/**
 * 自愈引擎 (Auto-Recovery Service)
 *
 * 后台定时巡检，执行 5 + 4 项自愈动作：
 *   1. 断路器自愈 — 自动 reset 过期断路器 → autoRecovery/breakerSync.js
 *   2. 模型自恢复 — 健康检查通过后自动重新启用
 *   3. 断路器 Redis 跨进程共享 → autoRecovery/breakerSync.js
 *   4. 配额预判 — 提前标记即将耗尽模型
 *   5. 自适应限流 — 异常模型自动降权
 *   +  L5 自进化层 → autoRecovery/l5Prediction.js:
 *   6. 连接泄漏检测
 *   7. 预警信号检测
 *   8. Redis 健康探活
 *   9. 预测性自愈 (EWMA + 预防性切流)
 */
import logger from '../utils/logger.js';
import { registerCleanup } from '../utils/shutdownRegistry.js';
import { healBreakers, syncToRedis, loadFromRedis } from './autoRecovery/breakerSync.js';
import { checkConnectionLeaks, detectEarlyWarning, healthPingRedis, predictiveHealing, runRootCauseAnalysis } from './autoRecovery/l5Prediction.js';

// ==================== 自愈指标 ====================

const recoveryMetrics = {
  breakerResets: 0,
  breakerEscalations: 0,
  modelReenabled: 0,
  weightAdjustments: 0,
  quotaPreExhausted: 0,
  lastCycle: null,
  cyclesCompleted: 0,
};

// ==================== 模型自恢复 ====================

const modelHealthTracker = new Map();

async function _healModels() {
  try {
    const { getPool } = await import('./modelPoolService.js');
    const pool = await getPool();
    const disabled = pool.filter(m => m.pool_enabled === 0);

    for (const model of disabled) {
      if (!model.endpoint) continue;
      const healthy = await _pingModel(model.endpoint);
      const tracker = modelHealthTracker.get(model.model_key) || { consecutivePasses: 0, consecutiveFails: 0 };

      if (healthy) {
        tracker.consecutivePasses++;
        tracker.consecutiveFails = 0;
        if (tracker.consecutivePasses >= 3) {
          const { updateModel } = await import('./modelPoolService.js');
          await updateModel(model.model_key, { pool_enabled: 1 });
          recoveryMetrics.modelReenabled++;
          logger.info('[AutoRecovery] Model re-enabled', { modelKey: model.model_key, passes: tracker.consecutivePasses });
          modelHealthTracker.delete(model.model_key);
          continue;
        }
      } else {
        tracker.consecutivePasses = 0;
        tracker.consecutiveFails++;
      }
      modelHealthTracker.set(model.model_key, tracker);
    }
  } catch (e) {
    logger.warn('[AutoRecovery] Model heal failed', { error: e.message });
  }
}

async function _pingModel(endpoint) {
  try {
    const url = endpoint.replace(/\/+$/, '') + '/health';
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    try {
      const res = await fetch(url, { signal: ctrl.signal, method: 'GET' });
      return res.ok;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return false;
  }
}

// ==================== 配额预判 ====================

const quotaPreExhausted = new Set();

async function _checkQuotaPreExhaustion() {
  try {
    const { getPool, getQuotaUsage } = await import('./modelPoolService.js');
    const pool = await getPool();

    for (const model of pool) {
      if (!model.quota_daily || model.quota_daily <= 0) continue;
      const usage = getQuotaUsage(model.model_key);
      const pct = model.quota_daily > 0 ? (usage.daily / model.quota_daily) * 100 : 0;
      if (pct >= 85) {
        if (!quotaPreExhausted.has(model.model_key)) {
          quotaPreExhausted.add(model.model_key);
          recoveryMetrics.quotaPreExhausted++;
          logger.warn('[AutoRecovery] Quota pre-exhausted', { modelKey: model.model_key, used: usage.daily, quota: model.quota_daily, pct: Math.round(pct) });
        }
      } else if (pct < 50) {
        quotaPreExhausted.delete(model.model_key);
      }
    }
  } catch (e) {
    logger.warn('[AutoRecovery] Quota check failed', { error: e.message });
  }
}

export function isQuotaPreExhausted(modelKey) {
  return quotaPreExhausted.has(modelKey);
}

// ==================== 自适应限流 ====================

const adaptiveWeights = new Map();

async function _adaptRateLimiting() {
  try {
    const { getModelBreakdown } = await import('./monitorService.js');
    const { getPool, updateModel } = await import('./modelPoolService.js');

    const breakdown = getModelBreakdown();
    const pool = await getPool();

    for (const model of pool) {
      const perf = breakdown.find(b => b.modelId === model.model_key);
      if (!perf || perf.calls < 5) continue;

      const errorRate = 1 - parseFloat(perf.successRate) / 100;
      const latency = perf.avgLatencyMs;

      const shouldReduce = latency > 3000 || errorRate > 0.3;
      const shouldRestore = latency < 1000 && errorRate < 0.05;

      if (shouldReduce) {
        const adj = adaptiveWeights.get(model.model_key) || { originalWeight: model.pool_weight || 1, currentWeight: model.pool_weight || 1 };
        if (adj.currentWeight > adj.originalWeight * 0.5) {
          adj.currentWeight = Math.max(1, Math.floor(adj.originalWeight * 0.5));
          adj.adjustedAt = Date.now();
          adaptiveWeights.set(model.model_key, adj);
          try { await updateModel(model.model_key, { pool_weight: adj.currentWeight }); } catch (e) { logger.warn('[AutoRecovery] Weight reduce update failed', { modelKey: model.model_key, error: e.message }); }
          recoveryMetrics.weightAdjustments++;
          logger.warn('[AutoRecovery] Weight reduced', { modelKey: model.model_key, from: model.pool_weight, to: adj.currentWeight, latency, errorRate: (errorRate * 100).toFixed(1) + '%' });
        }
      } else if (shouldRestore) {
        const adj = adaptiveWeights.get(model.model_key);
        if (adj && adj.currentWeight < adj.originalWeight) {
          adj.currentWeight = Math.min(adj.originalWeight, adj.currentWeight + 1);
          adj.adjustedAt = Date.now();
          try { await updateModel(model.model_key, { pool_weight: adj.currentWeight }); } catch (e) { logger.warn('[AutoRecovery] Weight restore update failed', { modelKey: model.model_key, error: e.message }); }
          recoveryMetrics.weightAdjustments++;
          logger.info('[AutoRecovery] Weight restored', { modelKey: model.model_key, to: adj.currentWeight });
          if (adj.currentWeight >= adj.originalWeight) adaptiveWeights.delete(model.model_key);
        }
      }
    }
  } catch (e) {
    logger.warn('[AutoRecovery] Adaptive rate limit failed', { error: e.message });
  }
}

// ==================== 编排队列 ====================

let _loopTimer = null;
let _running = false;

export async function runRecoveryCycle() {
  if (_running) return;
  _running = true;
  const startedAt = Date.now();

  try {
    await Promise.allSettled([
      healBreakers(recoveryMetrics),
      _healModels(),
      _checkQuotaPreExhaustion(),
      _adaptRateLimiting(),
      checkConnectionLeaks(),
      detectEarlyWarning(),
      predictiveHealing(),
    ]);

    import('./modelDispatcher.js').then(({ refreshScoreCache }) => refreshScoreCache()).catch(e => logger.warn('[AutoRecovery] Score cache refresh failed', { error: e.message }));

    loadFromRedis().catch(e => logger.warn('[AutoRecovery] Load breakers from Redis failed', { error: e.message }));

    if (recoveryMetrics.cyclesCompleted % 5 === 0) {
      const m = await getRecoveryMetrics();
      runRootCauseAnalysis(m).catch(e => logger.warn('[AutoRecovery] Root cause analysis failed', { error: e.message }));
    }

    recoveryMetrics.lastCycle = new Date().toISOString();
    recoveryMetrics.cyclesCompleted++;
    logger.debug('[AutoRecovery] Cycle completed', { ms: Date.now() - startedAt });
  } catch (e) {
    logger.error('[AutoRecovery] Cycle failed', { error: e.message });
  } finally {
    _running = false;
  }
}

export function startAutoRecoveryLoop(intervalMs = 60_000) {
  if (_loopTimer) return;
  _loopTimer = setInterval(runRecoveryCycle, intervalMs);
  if (_loopTimer && typeof _loopTimer.unref === 'function') _loopTimer.unref();
  registerCleanup(() => stopAutoRecoveryLoop());

  healthPingRedis().catch(e => logger.warn('[AutoRecovery] Redis health ping start failed', { error: e.message }));

  // 每 6h 事件学习进化 Tick
  const _evolutionTimer = setInterval(() => {
    import('./incidentLearningService.js').then(({ evolutionTick }) => {
      evolutionTick().catch(e => logger.warn('[AutoRecovery] Evolution tick failed', { error: e.message }));
    }).catch(e => logger.debug('[AutoRecovery] Evolution tick import failed', { error: e.message }));
  }, 6 * 3600_000);
  if (_evolutionTimer.unref) _evolutionTimer.unref();
  registerCleanup(() => clearInterval(_evolutionTimer));

  // 每 24h 自适应阈值漂移检测
  const _driftTimer = setInterval(() => {
    import('./adaptiveThresholdService.js').then(({ detectAndApplyDrift }) => {
      detectAndApplyDrift().catch(e => logger.warn('[AutoRecovery] Drift detection failed', { error: e.message }));
    }).catch(e => logger.debug('[AutoRecovery] Drift tick import failed', { error: e.message }));
  }, 24 * 3600_000);
  if (_driftTimer.unref) _driftTimer.unref();
  registerCleanup(() => clearInterval(_driftTimer));

  logger.info('[AutoRecovery] Loop started', { intervalMs });
}

export function stopAutoRecoveryLoop() {
  if (_loopTimer) { clearInterval(_loopTimer); _loopTimer = null; }
  logger.info('[AutoRecovery] Loop stopped');
}

export async function getRecoveryMetrics() {
  let breakersSize = 0;
  let openCount = 0;
  try {
    const { modelBreakers } = await import('../gateway/gatewayCore.js');
    if (modelBreakers) {
      breakersSize = modelBreakers.size;
      openCount = [...modelBreakers.values()].filter(b => b.getState() === 'open').length;
    }
  } catch (e) { logger.warn('[AutoRecovery] Metrics gatewayCore load failed', { error: e.message }); }

  let poolMetrics = null;
  try {
    const { getPoolMetrics: getDBPoolMetrics } = await import('../dao/db.js');
    poolMetrics = getDBPoolMetrics();
  } catch (e) { logger.warn('[AutoRecovery] DB pool metrics unavailable', { error: e.message }); }

  let redisMetrics = null;
  try {
    const { getRedisMetrics } = await import('../dao/redis.js');
    redisMetrics = getRedisMetrics();
  } catch (e) { logger.warn('[AutoRecovery] Redis metrics unavailable', { error: e.message }); }

  return {
    ...recoveryMetrics,
    activeBreakers: breakersSize,
    openBreakers: openCount,
    quotaPreExhausted: [...quotaPreExhausted],
    adaptiveWeights: Object.fromEntries(adaptiveWeights),
    poolMetrics,
    redisMetrics,
  };
}

// 定时同步到 Redis (独立于主循环，每 30s)
const _redisSyncTimer = setInterval(syncToRedis, 30_000);
if (_redisSyncTimer && typeof _redisSyncTimer.unref === 'function') _redisSyncTimer.unref();
registerCleanup(() => clearInterval(_redisSyncTimer));

export default { startAutoRecoveryLoop, stopAutoRecoveryLoop, runRecoveryCycle, getRecoveryMetrics, isQuotaPreExhausted };
