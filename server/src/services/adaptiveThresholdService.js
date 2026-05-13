/**
 * 自适应阈值引擎 (Adaptive Threshold Service)
 *
 * 基于历史基线自动校准所有阈值参数，替代硬编码。
 *
 * 核心机制：
 *   learnBaseline(7天) → 计算3σ异常边界 → 检测漂移 → 自动/回滚采纳
 */

import * as monitorService from './monitorService.js';
import logger from '../utils/logger.js';

// 被管理的阈值参数（默认值 → 可通过此服务动态更新）
const _managedThresholds = {
  failureThreshold:    { value: 5,   baseline: null, updatedAt: null },
  cooldownMs:          { value: 60000, baseline: null, updatedAt: null },
  errorRateThreshold:  { value: 0.5, baseline: null, updatedAt: null },
  modelHealthTimeout:  { value: 5000, baseline: null, updatedAt: null },
  alertCooldown_ms:    { value: 300000, baseline: null, updatedAt: null },
  weightReduceFactor:  { value: 0.5, baseline: null, updatedAt: null },
  predictiveWindow:    { value: 30, baseline: null, updatedAt: null },   // 30分钟预测窗口
  earlyWarningLatency: { value: 3000, baseline: null, updatedAt: null },
  earlyWarningErrorRate: { value: 0.05, baseline: null, updatedAt: null },
};

let _driftLock = false;

// ==================== 统计工具 ====================

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil(p * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

function stddev(values, mean) {
  if (values.length < 2) return 0;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function mean(values) {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

// ==================== 基线学习 ====================

export async function learnBaseline(days = 7) {
  try {
    const summary = monitorService.getDashboardSummary(days * 24);
    const breakdown = monitorService.getModelBreakdown();

    // 收集各模型延迟和错误率
    const latencies = [];
    const errorRates = [];
    const failCounts = [];

    for (const m of breakdown) {
      if (m.avgLatencyMs) latencies.push(m.avgLatencyMs);
      if (m.successRate !== undefined) errorRates.push(1 - m.successRate / 100);
      if (m.totalCalls > 0) failCounts.push((1 - m.successRate / 100) * m.totalCalls);
    }

    const latP95 = percentile(latencies.sort((a, b) => a - b), 0.95);
    const latP50 = percentile(latencies.sort((a, b) => a - b), 0.50);
    const errMean = mean(errorRates);
    const errStd = stddev(errorRates, errMean);
    const failMean = mean(failCounts);
    const failStd = stddev(failCounts, failMean);

    const baseline = {
      computedAt: new Date().toISOString(),
      sampleSize: breakdown.length,
      latencyP95: Math.round(latP95),
      latencyP50: Math.round(latP50),
      errorRateMean: Math.round(errMean * 10000) / 10000,
      errorRateP95: Math.round((errMean + 3 * errStd) * 10000) / 10000,
      failCountP95: Math.round((failMean + 2 * failStd)),
      totalCalls: summary.totalCalls || 0,
    };

    // 更新基线
    _managedThresholds.failureThreshold.baseline = Math.max(3, baseline.failCountP95);
    _managedThresholds.errorRateThreshold.baseline = Math.min(0.8, Math.max(0.1, baseline.errorRateP95));
    _managedThresholds.earlyWarningLatency.baseline = Math.round(latP50 * 1.5);
    _managedThresholds.earlyWarningErrorRate.baseline = Math.max(0.01, baseline.errorRateMean * 2);
    _managedThresholds.cooldownMs.baseline = Math.round(latP95 * 3); // 冷却 = 3 × P95延迟

    logger.info('[AdaptiveThreshold] Baseline learned', baseline);
    return baseline;
  } catch (err) {
    logger.error('[AdaptiveThreshold] Baseline learning failed:', err.message);
    return null;
  }
}

// ==================== 阈值读取/手动设置 ====================

export function getThreshold(key) {
  const t = _managedThresholds[key];
  if (!t) return null;
  return { value: t.value, baseline: t.baseline, updatedAt: t.updatedAt };
}

export function getAllThresholds() {
  return Object.fromEntries(
    Object.entries(_managedThresholds).map(([k, v]) => [k, { value: v.value, baseline: v.baseline, updatedAt: v.updatedAt }])
  );
}

export function setThreshold(key, value) {
  const t = _managedThresholds[key];
  if (!t) throw new Error(`Unknown threshold: ${key}`);
  t.value = value;
  t.updatedAt = new Date().toISOString();
  logger.info('[AdaptiveThreshold] Manual set', { key, value });
}

// ==================== 漂移检测与自动采纳 ====================

export async function detectAndApplyDrift() {
  if (_driftLock) return null;
  _driftLock = true;
  try {
    const baseline = await learnBaseline(7);
    if (!baseline) return null;

  const changes = [];

  // 对比每个阈值：当前值 vs 基线建议值
  const mappings = [
    { key: 'failureThreshold', recommended: Math.max(3, baseline.failCountP95) },
    { key: 'errorRateThreshold', recommended: Math.min(0.8, Math.max(0.1, baseline.errorRateP95)) },
    { key: 'cooldownMs', recommended: Math.round(baseline.latencyP95 * 3) },
    { key: 'earlyWarningLatency', recommended: Math.round(baseline.latencyP50 * 1.5) },
    { key: 'earlyWarningErrorRate', recommended: Math.max(0.01, baseline.errorRateMean * 2) },
  ];

  for (const { key, recommended } of mappings) {
    const t = _managedThresholds[key];
    if (!t || !t.baseline || recommended === 0) continue;

    const deviation = Math.abs(t.value - recommended) / Math.max(t.value, 1);
    if (deviation > 0.2) {
      // 偏差 > 20% → 自动采纳（保守方向：选择更严格的值）
      const newValue = key.includes('error') || key.includes('failure') || key.includes('latency')
        ? Math.min(t.value, recommended)  // 错误/失败/延迟阈值 → 偏向更严格
        : Math.max(t.value, recommended); // 冷却时间 → 偏向更宽松

      t.value = newValue;
      t.updatedAt = new Date().toISOString();
      changes.push({ key, from: t.value, to: newValue, deviation: Math.round(deviation * 100) });
    }
  }

  if (changes.length > 0) {
    logger.info('[AdaptiveThreshold] Drift applied', { changes });
  }

  return { changes, baseline };
  } finally {
    _driftLock = false;
  }
}

// ==================== 异常检测 ====================

export function isAnomalous(value, baselineMean, baselineStd, sigma = 3) {
  if (!baselineMean || !baselineStd) return false;
  return Math.abs(value - baselineMean) > sigma * baselineStd;
}

export function getCircuitBreakerConfig() {
  return {
    failureThreshold: _managedThresholds.failureThreshold.value,
    cooldownMs: _managedThresholds.cooldownMs.value,
    errorRateThreshold: _managedThresholds.errorRateThreshold.value,
  };
}

export default { learnBaseline, getThreshold, getAllThresholds, setThreshold, detectAndApplyDrift, isAnomalous, getCircuitBreakerConfig };
