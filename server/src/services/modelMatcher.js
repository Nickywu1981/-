import { healthCheck, getDefaultModel } from './aiEngine.js';
import { getModelsByCategory, getTaskCategory } from './modelCategories.js';

const MATCH_WEIGHTS = {
  availability: 0.35,
  capability: 0.25,
  cost: 0.20,
  latency: 0.10,
  accuracy: 0.10,
};

const MODEL_CAPABILITIES = {
  'claude-opus-4-7': { capability: 92, cost: 50, latency: 60, accuracy: 94 },
  'deepseek-v4-pro': { capability: 82, cost: 70, latency: 70, accuracy: 84 },
  'deepseek-v4-flash': { capability: 60, cost: 90, latency: 85, accuracy: 68 },
};

// 评分缓存 (避免每次调用都查询 monitor)
let _scoreCache = null;
let _scoreCacheTs = 0;
const SCORE_CACHE_TTL = 60_000;

function _getMonitorScores() {
  return _scoreCache || {};
}

/** 刷新监控评分缓存（由自愈引擎周期性调用） */
export async function refreshScoreCache() {
  try {
    const { getModelBreakdown } = await import('./monitorService.js');
    const breakdown = getModelBreakdown();
    _scoreCache = {};
    for (const b of breakdown) {
      _scoreCache[b.modelId] = {
        calls: b.calls,
        successRate: parseFloat(b.successRate) / 100,
        avgLatencyMs: b.avgLatencyMs,
      };
    }
    _scoreCacheTs = Date.now();
  } catch { /* monitorService 未加载，缓存保持空，使用静态基线 */ }
  return _scoreCache;
}

export function scoreModel(modelId, taskCategory, healthData = {}, monitorData = null) {
  const caps = MODEL_CAPABILITIES[modelId] || { capability: 50, cost: 50, latency: 50, accuracy: 50 };

  const perf = monitorData || _getMonitorScores()[modelId] || {};
  const successRate = perf.calls > 10 ? (perf.successRate || 1) : 1;
  const avgLatency = perf.avgLatencyMs || caps.latency;

  const breakerOpen = healthData[modelId]?.breakerState === 'open' ? 0 : 1;
  const healthy = (healthData[modelId]?.status !== 'error') ? 100 : 0;
  const available = healthy * breakerOpen;

  const capability = caps.capability * successRate;
  const latencyScore = Math.max(0, 100 - (avgLatency / 100));

  const score =
    available * MATCH_WEIGHTS.availability +
    capability * MATCH_WEIGHTS.capability +
    caps.cost * MATCH_WEIGHTS.cost +
    latencyScore * MATCH_WEIGHTS.latency +
    caps.accuracy * MATCH_WEIGHTS.accuracy;

  return {
    modelId,
    score: Math.round(score),
    details: { available, capability, cost: caps.cost, latency: latencyScore, accuracy: caps.accuracy, successRate },
  };
}

export function rankModels(candidates, taskCategory, healthData) {
  const scores = candidates.map((id) => scoreModel(id, taskCategory, healthData));
  scores.sort((a, b) => b.score - a.score);

  return {
    ranked: scores,
    best: scores[0] || null,
    matchLog: scores.map((s) =>
      `${s.modelId}: ${s.score}分 (可用${s.details.available} 能力${s.details.capability} 成本${s.details.cost})`,
    ),
  };
}

// ==================== 健康数据缓存 ====================

let cachedHealthData = null;
let healthCacheTime = 0;
const HEALTH_CACHE_TTL = 30000;

export async function getHealthData() {
  if (cachedHealthData && Date.now() - healthCacheTime < HEALTH_CACHE_TTL) {
    return cachedHealthData;
  }
  cachedHealthData = await healthCheck();
  healthCacheTime = Date.now();
  return cachedHealthData;
}

// ==================== TaskAnalyzer ====================

export function analyzeTask(taskType, input) {
  const category = getTaskCategory(taskType);
  const candidates = getModelsByCategory(category);
  const preferred = getDefaultModel(taskType);

  const needsMultiModel =
    taskType === 'compliance_check' ||
    taskType === 'poster_gen' ||
    taskType === 'video_packaging';

  return {
    taskType,
    category,
    candidates: candidates.map((m) => m.id),
    preferred,
    needsMultiModel,
    complexity: input?.quality === 'high' ? 'high' : 'normal',
  };
}
