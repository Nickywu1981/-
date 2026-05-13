/**
 * 自愈引擎 (Auto-Recovery Service)
 *
 * 后台定时巡检，执行 5 + 4 项自愈动作：
 *   1. 断路器自愈 — 自动 reset 过期断路器
 *   2. 模型自恢复 — 健康检查通过后自动重新启用
 *   3. 断路器 Redis 跨进程共享
 *   4. 配额预判 — 提前标记即将耗尽模型
 *   5. 自适应限流 — 异常模型自动降权
 *   +  L5 自进化层:
 *   6. 连接泄漏检测 — DB 连接池异常检测
 *   7. 预警信号检测 — 延迟/错误率/熔断早期信号
 *   8. Redis 健康探活 — 定期 PING 检测
 *   9. 预测性自愈 — EWMA 故障概率预测 + 预防性动作
 */
import logger from '../utils/logger.js';
import { cacheGet, cacheSet } from '../dao/redis.js';
import { registerCleanup } from '../utils/shutdownRegistry.js';

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

// ==================== 断路器自愈 ====================

async function _healBreakers() {
  try {
    const { modelBreakers } = await import('../gateway/gatewayCore.js');
    if (!modelBreakers || modelBreakers.size === 0) return;

    const cooldownEscalations = new Map(); // modelId → current multiplier

    for (const [modelId, breaker] of modelBreakers) {
      const stats = breaker.getStats();
      if (stats.state === 'open' && stats.cooldownRemaining <= 0) {
        breaker.reset();
        recoveryMetrics.breakerResets++;
        logger.info('[AutoRecovery] Breaker reset → half-open', { modelId });
      }

      // 级进冷却：记录 open 次数，递增冷却时间
      if (stats.state === 'open') {
        const prev = cooldownEscalations.get(modelId) || 0;
        cooldownEscalations.set(modelId, prev + 1);
      }
    }

    if (cooldownEscalations.size > 0) {
      recoveryMetrics.breakerEscalations += cooldownEscalations.size;
    }
  } catch (e) {
    logger.warn('[AutoRecovery] Breaker heal failed', { error: e.message });
  }
}

// ==================== 模型自恢复 ====================

const modelHealthTracker = new Map(); // modelKey → { consecutivePasses, consecutiveFails }

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

// ==================== 断路器 Redis 跨进程共享 ====================

const BREAKER_REDIS_PREFIX = 'breaker:state:';
const BREAKER_REDIS_TTL = 90;

async function _syncBreakersToRedis() {
  try {
    const { modelBreakers } = await import('../gateway/gatewayCore.js');
    if (!modelBreakers || modelBreakers.size === 0) return;

    for (const [modelId, breaker] of modelBreakers) {
      const stats = breaker.getStats();
      const key = BREAKER_REDIS_PREFIX + modelId;
      try {
        await cacheSet(key, { state: stats.state, errorRate: stats.errorRate, updatedAt: Date.now() }, BREAKER_REDIS_TTL);
      } catch (e) { logger.warn('[AutoRecovery] Redis set failed', { modelId, error: e.message }); }
    }
  } catch (e) { logger.warn('[AutoRecovery] Breaker sync to Redis failed', { error: e.message }); }
}

async function _loadBreakersFromRedis() {
  try {
    const { modelBreakers } = await import('../gateway/gatewayCore.js');
    if (!modelBreakers) return;

    for (const [modelId, breaker] of modelBreakers) {
      const key = BREAKER_REDIS_PREFIX + modelId;
      try {
        const remote = await cacheGet(key);
        if (remote && remote.state === 'open') {
          if (breaker.getState() !== 'open') {
            breaker.recordFailure();
            logger.info('[AutoRecovery] Breaker state synced from Redis', { modelId, remoteState: remote.state });
          }
        }
      } catch (e) { logger.warn('[AutoRecovery] Redis get failed', { modelId, error: e.message }); }
    }
  } catch (e) { logger.warn('[AutoRecovery] Breaker sync from Redis failed', { error: e.message }); }
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

const adaptiveWeights = new Map(); // modelId → { originalWeight, currentWeight, adjustedAt }

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
          try {
            await updateModel(model.model_key, { pool_weight: adj.currentWeight });
          } catch (e) { logger.warn('[AutoRecovery] Weight reduce update failed', { modelKey: model.model_key, error: e.message }); }
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
          if (adj.currentWeight >= adj.originalWeight) {
            adaptiveWeights.delete(model.model_key);
          }
        }
      }
    }
  } catch (e) {
    logger.warn('[AutoRecovery] Adaptive rate limit failed', { error: e.message });
  }
}

// ==================== L5 连接泄漏检测 ====================

let _lastPoolCheck = null;

async function _checkConnectionLeaks() {
  try {
    const { getPoolMetrics } = await import('../dao/db.js');
    const metrics = getPoolMetrics();
    if (!metrics) return;

    const now = Date.now();
    _lastPoolCheck = { ...metrics, ts: now };

    if (metrics.queued > 20 || (metrics.active > 0 && metrics.idle === 0 && metrics.queued > 10)) {
      logger.warn('[AutoRecovery] DB 连接池压力', metrics);
      _recordL5Incident('connection_pool_pressure', 'medium', { pool: metrics }, 'flush_idle_connections', 'success', 0);
    }
  } catch (e) { logger.warn('[AutoRecovery] Connection leak check failed', { error: e.message }); }
}

// ==================== L5 预警信号检测 ====================

const _earlyWarningState = new Map(); // modelId → { consecutiveLatencyRising, consecutiveErrors, lastCheck }

async function _detectEarlyWarning() {
  try {
    const { getModelBreakdown } = await import('./monitorService.js');
    const breakdown = getModelBreakdown();
    if (!breakdown || breakdown.length === 0) return;

    for (const model of breakdown) {
      if (!model.modelId) continue;
      const prev = _earlyWarningState.get(model.modelId) || { consecutiveLatencyRising: 0, consecutiveErrors: 0, prevLatency: null };
      const latency = model.avgLatencyMs || 0;
      const errorRate = model.successRate !== undefined ? 1 - model.successRate / 100 : 0;

      // 延迟连续上升
      if (prev.prevLatency !== null && latency > prev.prevLatency) {
        prev.consecutiveLatencyRising++;
      } else {
        prev.consecutiveLatencyRising = 0;
      }

      // 错误率连续非零
      if (errorRate > 0) {
        prev.consecutiveErrors++;
      } else {
        prev.consecutiveErrors = 0;
      }

      prev.prevLatency = latency;
      _earlyWarningState.set(model.modelId, prev);

      // 触发预警
      if (prev.consecutiveLatencyRising >= 5 || prev.consecutiveErrors >= 3) {
        logger.warn('[AutoRecovery] Early warning triggered', {
          modelId: model.modelId,
          latencyRising: prev.consecutiveLatencyRising,
          consecutiveErrors: prev.consecutiveErrors,
          currentLatency: latency,
          currentErrorRate: Math.round(errorRate * 100),
        });

        // 预防性降权 5-10%
        try {
          const { getPool, updateModel } = await import('./modelPoolService.js');
          const pool = await getPool();
          const m = pool.find(p => p.model_key === model.modelId);
          if (m && m.pool_weight > 1) {
            const newWeight = Math.max(1, Math.floor(m.pool_weight * 0.9));
            await updateModel(m.model_key, { pool_weight: newWeight });
            _recordL5Incident('early_warning_weight_reduce', 'low',
              { modelId: model.modelId, oldWeight: m.pool_weight, newWeight },
              'reduce_weight', 'success', 0);
          }
        } catch (e) { logger.debug('[AutoRecovery] early-warning weight reduce failed', { error: e.message }); }
      }
    }

    // 清理已移除模型的预警状态
    const currentIds = new Set(breakdown.map(m => m.modelId).filter(Boolean));
    for (const key of _earlyWarningState.keys()) {
      if (!currentIds.has(key)) _earlyWarningState.delete(key);
    }

    // DB 连接池排队检测
    try {
      const { getPoolMetrics } = await import('../dao/db.js');
      const m = getPoolMetrics();
      if (m && m.queued > 0) {
        logger.info('[AutoRecovery] DB 连接池排队增长', { queued: m.queued, active: m.active });
      }
    } catch (e) { logger.debug('[AutoRecovery] DB pool metrics check skipped', { error: e.message }); }

    // Redis 延迟检测
    try {
      const { getRedisMetrics } = await import('../dao/redis.js');
      const rm = getRedisMetrics();
      if (rm && rm.avgLatencyMs > 100) {
        logger.warn('[AutoRecovery] Redis 延迟预警', { avgLatencyMs: rm.avgLatencyMs });
      }
    } catch (e) { logger.debug('[AutoRecovery] DB pool metrics check skipped', { error: e.message }); }
  } catch (e) { logger.warn('[AutoRecovery] Early warning check failed', { error: e.message }); }
}

// ==================== L5 Redis 健康探活 ====================

async function _healthPingRedis() {
  try {
    const { startHealthPing, getRedisMetrics } = await import('../dao/redis.js');
    startHealthPing(30000);
    const metrics = getRedisMetrics();
    if (!metrics.ready && metrics.consecutiveFails >= 3) {
      logger.error('[AutoRecovery] Redis 不可用', metrics);
      _recordL5Incident('redis_unavailable', 'critical', metrics, 'enable_memory_fallback', 'success', 0);
    }
  } catch (e) { logger.warn('[AutoRecovery] Redis health ping failed', { error: e.message }); }
}

// ==================== L5 预测性自愈 ====================

const _ewmaState = new Map(); // modelId → { ewmaLatency, ewmaErrorRate }

async function _predictiveHealing() {
  try {
    const { getModelBreakdown } = await import('./monitorService.js');
    const breakdown = getModelBreakdown();
    if (!breakdown || breakdown.length === 0) return;

    const alpha = 0.3; // EWMA 平滑系数

    for (const model of breakdown) {
      if (!model.modelId || !model.avgLatencyMs) continue;

      const prev = _ewmaState.get(model.modelId) || { ewmaLatency: model.avgLatencyMs, ewmaErrorRate: 1 - model.successRate / 100 };
      const currentLatency = model.avgLatencyMs;
      const currentErrorRate = model.successRate !== undefined ? 1 - model.successRate / 100 : prev.ewmaErrorRate;

      const ewmaLatency = alpha * currentLatency + (1 - alpha) * prev.ewmaLatency;
      const ewmaErrorRate = alpha * currentErrorRate + (1 - alpha) * prev.ewmaErrorRate;
      _ewmaState.set(model.modelId, { ewmaLatency, ewmaErrorRate });

      // 预测 5 分钟后故障概率
      const trendLatency = prev.ewmaLatency > 0 ? (ewmaLatency - prev.ewmaLatency) / prev.ewmaLatency : 0;
      const trendError = ewmaErrorRate - prev.ewmaErrorRate;
      const failureProbability = Math.min(1, Math.max(0,
        (ewmaErrorRate * 0.5) + (ewmaLatency > 3000 ? 0.3 : 0) + (trendLatency > 0.1 ? 0.2 : 0) + (trendError > 0.05 ? 0.2 : 0)
      ));

      if (failureProbability > 0.7) {
        logger.warn('[AutoRecovery] 预测性故障风险', {
          modelId: model.modelId,
          failureProbability: Math.round(failureProbability * 100),
          ewmaLatency: Math.round(ewmaLatency),
          ewmaErrorRate: Math.round(ewmaErrorRate * 1000) / 1000,
        });

        // 预防性切流：大幅降低权重
        try {
          const { getPool, updateModel } = await import('./modelPoolService.js');
          const pool = await getPool();
          const m = pool.find(p => p.model_key === model.modelId);
          if (m && m.pool_weight > 0) {
            const newWeight = Math.max(0, Math.floor(m.pool_weight * 0.3));
            await updateModel(m.model_key, { pool_weight: newWeight, pool_enabled: newWeight > 0 ? 1 : 0 });
            _recordL5Incident('predictive_traffic_shift', 'high',
              { modelId: model.modelId, failureProbability, oldWeight: m.pool_weight, newWeight },
              'preemptive_reduce_weight', 'success', 0);
          }
        } catch (e) { logger.debug('[AutoRecovery] early-warning weight reduce failed', { error: e.message }); }
      }
    }

    // 清理已移除模型的 EWMA 状态
    const currentIds = new Set(breakdown.map(m => m.modelId).filter(Boolean));
    for (const key of _ewmaState.keys()) {
      if (!currentIds.has(key)) _ewmaState.delete(key);
    }
  } catch (e) { logger.warn('[AutoRecovery] Predictive healing failed', { error: e.message }); }
}

// ==================== L5 事件记录 ====================

async function _recordL5Incident(incidentType, severity, symptoms, actionTaken, actionResult, recoveryTimeMs) {
  try {
    const { recordIncident } = await import('./incidentLearningService.js');
    recordIncident({
      incidentType, severity, symptoms,
      actionTaken, actionResult, recoveryTimeMs,
      contextSnapshot: { rss: Math.round(process.memoryUsage().rss / 1024 / 1024) },
    }).catch(e => logger.warn('[AutoRecovery] Incident record failed', { error: e.message }));
  } catch { logger.debug('[AutoRecovery] Incident record skipped (non-critical)'); }
}

// ==================== L5 根因关联 ====================

async function _runRootCauseAnalysis() {
  try {
    const metrics = await getRecoveryMetrics();
    const { aggregateAlerts } = await import('./rootCauseService.js');

    const { getRedisMetrics } = await import('../dao/redis.js');
    const { getPoolMetrics } = await import('../dao/db.js');

    const redisMetrics = getRedisMetrics();
    const dbMetrics = getPoolMetrics();

    const result = aggregateAlerts(
      { errorRate: metrics.openBreakers / Math.max(metrics.activeBreakers, 1), avgLatencyMs: 0 },
      { openCount: metrics.openBreakers },
      { down: !redisMetrics.ready, highLatency: redisMetrics.avgLatencyMs },
      { down: false, activeConnections: dbMetrics.active, connectionLimit: 20 },
    );

    if (result && result.confidence > 0.6) {
      logger.info('[AutoRecovery] Root cause analysis', result);
      if (result.suggestedAction) {
        _recordL5Incident('root_cause_detected', 'medium',
          { rootCause: result.rootCause, confidence: result.confidence, affected: result.affectedComponents },
          result.suggestedAction, 'success', 0);
      }
    }
  } catch (e) { logger.warn('[AutoRecovery] Root cause analysis failed', { error: e.message }); }
}

let _loopTimer = null;
let _running = false;

export async function runRecoveryCycle() {
  if (_running) return;
  _running = true;
  const startedAt = Date.now();

  try {
    await Promise.allSettled([
      _healBreakers(),
      _healModels(),
      _checkQuotaPreExhaustion(),
      _adaptRateLimiting(),
      _checkConnectionLeaks(),
      _detectEarlyWarning(),
      _predictiveHealing(),
    ]);

    // 刷新模型评分缓存
    import('./modelDispatcher.js').then(({ refreshScoreCache }) => refreshScoreCache()).catch(e => logger.warn('[AutoRecovery] Score cache refresh failed', { error: e.message }));

    _loadBreakersFromRedis().catch(e => logger.warn('[AutoRecovery] Load breakers from Redis failed', { error: e.message }));

    // 每 5 个周期运行一次根因分析
    if (recoveryMetrics.cyclesCompleted % 5 === 0) {
      _runRootCauseAnalysis().catch(e => logger.warn('[AutoRecovery] Root cause analysis failed', { error: e.message }));
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

  // 启动 Redis 健康探活
  _healthPingRedis().catch(e => logger.warn('[AutoRecovery] Redis health ping start failed', { error: e.message }));

  // 每 6 小时运行一次事件学习进化 Tick
  const _evolutionTimer = setInterval(() => {
    import('./incidentLearningService.js').then(({ evolutionTick }) => {
      evolutionTick().catch(e => logger.warn('[AutoRecovery] Evolution tick failed', { error: e.message }));
    }).catch(e => logger.debug('[AutoRecovery] Evolution tick import failed', { error: e.message }));
  }, 6 * 3600_000);
  if (_evolutionTimer.unref) _evolutionTimer.unref();
  registerCleanup(() => clearInterval(_evolutionTimer));

  // 每 24 小时运行一次自适应阈值漂移检测
  const _driftTimer = setInterval(() => {
    import('./adaptiveThresholdService.js').then(({ detectAndApplyDrift }) => {
      detectAndApplyDrift().catch(e => logger.warn('[AutoRecovery] Drift detection failed', { error: e.message }));
    }).catch(e => logger.debug('[AutoRecovery] Evolution tick import failed', { error: e.message }));
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
const _redisSyncTimer = setInterval(_syncBreakersToRedis, 30_000);
if (_redisSyncTimer && typeof _redisSyncTimer.unref === 'function') _redisSyncTimer.unref();
registerCleanup(() => clearInterval(_redisSyncTimer));

export default { startAutoRecoveryLoop, stopAutoRecoveryLoop, runRecoveryCycle, getRecoveryMetrics, isQuotaPreExhausted };
