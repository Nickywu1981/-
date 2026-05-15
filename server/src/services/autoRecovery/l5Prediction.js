/**
 * L5 自进化预测层 — 预警检测 + 预测性自愈 + 根因关联
 * 提取自 autoRecoveryService.js
 */
import logger from '../../utils/logger.js';

const _earlyWarningState = new Map();
const _ewmaState = new Map(); // modelId → { ewmaLatency, ewmaErrorRate }

// 记录 L5 事件
async function _recordIncident(incidentType, severity, symptoms, actionTaken, actionResult, recoveryTimeMs) {
  try {
    const { recordIncident } = await import('../incidentLearningService.js');
    recordIncident({
      incidentType, severity, symptoms,
      actionTaken, actionResult, recoveryTimeMs,
      contextSnapshot: { rss: Math.round(process.memoryUsage().rss / 1024 / 1024) },
    }).catch(e => logger.warn('[L5] Incident record failed', { error: e.message }));
  } catch { logger.debug('[L5] Incident record skipped (non-critical)'); }
}

// 连接泄漏检测
let _lastPoolCheck = null;

export async function checkConnectionLeaks() {
  try {
    const { getPoolMetrics } = await import('../../dao/db.js');
    const metrics = getPoolMetrics();
    if (!metrics) return;

    const now = Date.now();
    _lastPoolCheck = { ...metrics, ts: now };

    if (metrics.queued > 20 || (metrics.active > 0 && metrics.idle === 0 && metrics.queued > 10)) {
      logger.warn('[L5] DB 连接池压力', metrics);
      _recordIncident('connection_pool_pressure', 'medium', { pool: metrics }, 'flush_idle_connections', 'success', 0);
    }
  } catch (e) { logger.warn('[L5] Connection leak check failed', { error: e.message }); }
}

// 预警信号检测
export async function detectEarlyWarning() {
  try {
    const { getModelBreakdown } = await import('../monitorService.js');
    const breakdown = getModelBreakdown();
    if (!breakdown || breakdown.length === 0) return;

    for (const model of breakdown) {
      if (!model.modelId) continue;
      const prev = _earlyWarningState.get(model.modelId) || { consecutiveLatencyRising: 0, consecutiveErrors: 0, prevLatency: null };
      const latency = model.avgLatencyMs || 0;
      const errorRate = model.successRate !== undefined ? 1 - model.successRate / 100 : 0;

      prev.consecutiveLatencyRising = (prev.prevLatency !== null && latency > prev.prevLatency) ? prev.consecutiveLatencyRising + 1 : 0;
      prev.consecutiveErrors = errorRate > 0 ? prev.consecutiveErrors + 1 : 0;
      prev.prevLatency = latency;
      _earlyWarningState.set(model.modelId, prev);

      if (prev.consecutiveLatencyRising >= 5 || prev.consecutiveErrors >= 3) {
        logger.warn('[L5] Early warning triggered', {
          modelId: model.modelId,
          latencyRising: prev.consecutiveLatencyRising,
          consecutiveErrors: prev.consecutiveErrors,
          currentLatency: latency,
          currentErrorRate: Math.round(errorRate * 100),
        });

        try {
          const { getPool, updateModel } = await import('../modelPoolService.js');
          const pool = await getPool();
          const m = pool.find(p => p.model_key === model.modelId);
          if (m && m.pool_weight > 1) {
            const newWeight = Math.max(1, Math.floor(m.pool_weight * 0.9));
            await updateModel(m.model_key, { pool_weight: newWeight });
            _recordIncident('early_warning_weight_reduce', 'low', { modelId: model.modelId, oldWeight: m.pool_weight, newWeight }, 'reduce_weight', 'success', 0);
          }
        } catch (e) { logger.debug('[L5] Early-warning weight reduce failed', { error: e.message }); }
      }
    }

    const currentIds = new Set(breakdown.map(m => m.modelId).filter(Boolean));
    for (const key of _earlyWarningState.keys()) { if (!currentIds.has(key)) _earlyWarningState.delete(key); }

    // DB 连接池排队 + Redis 延迟检测
    try {
      const { getPoolMetrics } = await import('../../dao/db.js');
      const m = getPoolMetrics();
      if (m && m.queued > 0) logger.info('[L5] DB 连接池排队增长', { queued: m.queued, active: m.active });
    } catch (e) { logger.debug('[L5] DB pool metrics check skipped', { error: e.message }); }

    try {
      const { getRedisMetrics } = await import('../../dao/redis.js');
      const rm = getRedisMetrics();
      if (rm && rm.avgLatencyMs > 100) logger.warn('[L5] Redis 延迟预警', { avgLatencyMs: rm.avgLatencyMs });
    } catch (e) { logger.debug('[L5] Redis metrics check skipped', { error: e.message }); }
  } catch (e) { logger.warn('[L5] Early warning check failed', { error: e.message }); }
}

// Redis 健康探活
export async function healthPingRedis() {
  try {
    const { startHealthPing, getRedisMetrics } = await import('../../dao/redis.js');
    startHealthPing(30000);
    const metrics = getRedisMetrics();
    if (!metrics.ready && metrics.consecutiveFails >= 3) {
      logger.error('[L5] Redis 不可用', metrics);
      _recordIncident('redis_unavailable', 'critical', metrics, 'enable_memory_fallback', 'success', 0);
    }
  } catch (e) { logger.warn('[L5] Redis health ping failed', { error: e.message }); }
}

// 预测性自愈 — EWMA 故障概率预测 + 预防性切流
export async function predictiveHealing() {
  try {
    const { getModelBreakdown } = await import('../monitorService.js');
    const breakdown = getModelBreakdown();
    if (!breakdown || breakdown.length === 0) return;

    const alpha = 0.3;

    for (const model of breakdown) {
      if (!model.modelId || !model.avgLatencyMs) continue;

      const prev = _ewmaState.get(model.modelId) || { ewmaLatency: model.avgLatencyMs, ewmaErrorRate: 1 - model.successRate / 100 };
      const currentLatency = model.avgLatencyMs;
      const currentErrorRate = model.successRate !== undefined ? 1 - model.successRate / 100 : prev.ewmaErrorRate;

      const ewmaLatency = alpha * currentLatency + (1 - alpha) * prev.ewmaLatency;
      const ewmaErrorRate = alpha * currentErrorRate + (1 - alpha) * prev.ewmaErrorRate;
      _ewmaState.set(model.modelId, { ewmaLatency, ewmaErrorRate });

      const trendLatency = prev.ewmaLatency > 0 ? (ewmaLatency - prev.ewmaLatency) / prev.ewmaLatency : 0;
      const trendError = ewmaErrorRate - prev.ewmaErrorRate;
      const failureProbability = Math.min(1, Math.max(0,
        (ewmaErrorRate * 0.5) + (ewmaLatency > 3000 ? 0.3 : 0) + (trendLatency > 0.1 ? 0.2 : 0) + (trendError > 0.05 ? 0.2 : 0)
      ));

      if (failureProbability > 0.7) {
        logger.warn('[L5] 预测性故障风险', { modelId: model.modelId, failureProbability: Math.round(failureProbability * 100), ewmaLatency: Math.round(ewmaLatency), ewmaErrorRate: Math.round(ewmaErrorRate * 1000) / 1000 });

        try {
          const { getPool, updateModel } = await import('../modelPoolService.js');
          const pool = await getPool();
          const m = pool.find(p => p.model_key === model.modelId);
          if (m && m.pool_weight > 0) {
            const newWeight = Math.max(0, Math.floor(m.pool_weight * 0.3));
            await updateModel(m.model_key, { pool_weight: newWeight, pool_enabled: newWeight > 0 ? 1 : 0 });
            _recordIncident('predictive_traffic_shift', 'high', { modelId: model.modelId, failureProbability, oldWeight: m.pool_weight, newWeight }, 'preemptive_reduce_weight', 'success', 0);
          }
        } catch (e) { logger.debug('[L5] Predictive weight reduce failed', { error: e.message }); }
      }
    }

    const currentIds = new Set(breakdown.map(m => m.modelId).filter(Boolean));
    for (const key of _ewmaState.keys()) { if (!currentIds.has(key)) _ewmaState.delete(key); }
  } catch (e) { logger.warn('[L5] Predictive healing failed', { error: e.message }); }
}

// 根因关联分析
export async function runRootCauseAnalysis(metrics) {
  try {
    const { aggregateAlerts } = await import('../rootCauseService.js');
    const { getRedisMetrics } = await import('../../dao/redis.js');
    const { getPoolMetrics } = await import('../../dao/db.js');

    const redisMetrics = getRedisMetrics();
    const dbMetrics = getPoolMetrics();

    const result = aggregateAlerts(
      { errorRate: metrics.openBreakers / Math.max(metrics.activeBreakers, 1), avgLatencyMs: 0 },
      { openCount: metrics.openBreakers },
      { down: !redisMetrics.ready, highLatency: redisMetrics.avgLatencyMs },
      { down: false, activeConnections: dbMetrics.active, connectionLimit: 20 },
    );

    if (result && result.confidence > 0.6) {
      logger.info('[L5] Root cause analysis', result);
      if (result.suggestedAction) {
        _recordIncident('root_cause_detected', 'medium', { rootCause: result.rootCause, confidence: result.confidence, affected: result.affectedComponents }, result.suggestedAction, 'success', 0);
      }
    }
  } catch (e) { logger.warn('[L5] Root cause analysis failed', { error: e.message }); }
}
