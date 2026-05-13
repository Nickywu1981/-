/**
 * 根因关联引擎 (Root Cause Analysis Engine)
 *
 * 多源告警聚合 → 依赖图向下追溯 → 置信度打分 → 推荐自愈动作
 *
 * 组件依赖图定义所有服务间的因果关系：
 *   gatewayInfer → aiEngine → modelAdapter → externalAPI
 *   dispatch → dispatchStrategy → modelPool → aiEngine
 *   所有 → circuitBreaker → monitorService
 *   所有 → Redis → 内存缓存降级
 *   所有 → DB → Mock回退
 */

import logger from '../utils/logger.js';

// ==================== 组件依赖图 ====================

const DEPENDENCY_GRAPH = {
  gatewayInfer:    ['aiEngine', 'circuitBreaker', 'promptWrapper', 'redis', 'monitorService'],
  gatewayDispatch: ['modelDispatcher', 'dispatchStrategy', 'modelPool', 'aiEngine', 'circuitBreaker'],
  gatewayRoute:    ['modelRouter', 'circuitBreaker', 'aiEngine'],
  aiEngine:        ['modelAdapter', 'semanticCache', 'redis'],
  modelDispatcher: ['dispatchStrategy', 'modelPool', 'aiEngine', 'monitorService'],
  modelRouter:     ['modelPool', 'aiEngine', 'circuitBreaker'],
  modelAdapter:    ['externalAPI'],
  modelPool:       ['db', 'modelConfigDao'],
  semanticCache:   ['redis'],
  dispatchStrategy:['redis'],
  promptWrapper:   ['templateEngine', 'db'],
  templateEngine:  ['db'],
  monitorService:  ['redis'],
  circuitBreaker:  [],
  externalAPI:     [],
  db:              [],
  redis:           [],
};

// 反向索引：哪些组件依赖我
const REVERSE_DEPENDENCY = {};
for (const [comp, deps] of Object.entries(DEPENDENCY_GRAPH)) {
  for (const dep of deps) {
    if (!REVERSE_DEPENDENCY[dep]) REVERSE_DEPENDENCY[dep] = [];
    REVERSE_DEPENDENCY[dep].push(comp);
  }
}

// ==================== 症状解析 ====================

function parseSymptoms(event) {
  const symptoms = [];
  if (event.breakerTrips > 0) symptoms.push({ component: 'circuitBreaker', type: 'breaker_open', severity: 'high', value: event.breakerTrips });
  if (event.errorRate > 0.3) symptoms.push({ component: 'modelAdapter', type: 'error_rate_high', severity: 'high', value: event.errorRate });
  if (event.avgLatencyMs > 3000) symptoms.push({ component: 'modelAdapter', type: 'latency_high', severity: 'medium', value: event.avgLatencyMs });
  if (event.redisDown) symptoms.push({ component: 'redis', type: 'unavailable', severity: 'critical', value: 1 });
  if (event.dbDown) symptoms.push({ component: 'db', type: 'unavailable', severity: 'critical', value: 1 });
  if (event.connectionLeak) symptoms.push({ component: 'db', type: 'connection_leak', severity: 'medium', value: event.activeConnections });
  if (event.cacheMissRate > 0.5) symptoms.push({ component: 'redis', type: 'cache_degraded', severity: 'low', value: event.cacheMissRate });
  return symptoms;
}

// ==================== 根因推断 ====================

export function inferRootCause(symptoms) {
  if (!symptoms || symptoms.length === 0) return { rootCause: 'unknown', confidence: 0, affectedComponents: [], suggestedAction: null };

  // 按 severity 排序（critical 优先）
  const sorted = [...symptoms].sort((a, b) => {
    const sev = { critical: 4, high: 3, medium: 2, low: 1 };
    return (sev[b.severity] || 0) - (sev[a.severity] || 0);
  });

  // 规则1：多个上层组件同时告警 → 追溯共同依赖的底层组件
  const affectedComponents = [...new Set(sorted.map(s => s.component))];
  const commonDeps = new Map(); // dep → count

  for (const comp of affectedComponents) {
    const deps = DEPENDENCY_GRAPH[comp] || [];
    for (const dep of deps) {
      commonDeps.set(dep, (commonDeps.get(dep) || 0) + 1);
    }
  }

  // 规则2：底层组件作为最严重症状
  const bottomMost = sorted.find(s => ['redis', 'db', 'externalAPI'].includes(s.component));

  // 规则3：被最多上层组件共同依赖的底层组件
  const sortedDeps = [...commonDeps.entries()]
    .filter(([dep]) => ['redis', 'db', 'externalAPI'].includes(dep) || commonDeps.get(dep) >= 2)
    .sort(([, a], [, b]) => b - a);

  let rootCause = 'unknown';
  let confidence = 0;
  let suggestedAction = null;

  if (sortedDeps.length > 0 && sortedDeps[0][1] >= affectedComponents.length * 0.5) {
    // 共同依赖 → 根因
    rootCause = `${sortedDeps[0][0]}_degraded`;
    confidence = Math.min(0.95, 0.5 + sortedDeps[0][1] / affectedComponents.length * 0.5);
    suggestedAction = getSuggestedAction(sortedDeps[0][0]);
  } else if (bottomMost) {
    // 底层组件直接故障
    rootCause = `${bottomMost.component}_${bottomMost.type}`;
    confidence = bottomMost.severity === 'critical' ? 0.9 : 0.6;
    suggestedAction = getSuggestedAction(bottomMost.component);
  } else if (affectedComponents.length === 1) {
    // 单组件故障
    rootCause = `${affectedComponents[0]}_degraded`;
    confidence = 0.4;
    suggestedAction = `check_${affectedComponents[0]}`;
  } else {
    // 多组件无共同依赖 → 外部因素
    rootCause = 'external_cascade';
    confidence = 0.3;
    suggestedAction = 'run_full_recovery_cycle';
  }

  return {
    rootCause,
    confidence: Math.round(confidence * 100) / 100,
    affectedComponents,
    commonDependency: sortedDeps[0]?.[0] || null,
    suggestedAction,
  };
}

function getSuggestedAction(dep) {
  const actions = {
    redis: 'enable_memory_fallback',
    db: 'retry_with_backoff',
    externalAPI: 'activate_fallback_chain',
    circuitBreaker: 'reset_all_breakers',
  };
  return actions[dep] || `check_${dep}`;
}

// ==================== 多源聚合分析 ====================

export function aggregateAlerts(monitorSummary, breakerStats, redisMetrics, dbMetrics) {
  const symptoms = [];

  // 监控数据
  if (monitorSummary) {
    if (monitorSummary.errorRate > 0.3) symptoms.push({ component: 'modelAdapter', type: 'error_rate_high', severity: 'high', value: monitorSummary.errorRate });
    if (monitorSummary.avgLatencyMs > 3000) symptoms.push({ component: 'modelAdapter', type: 'latency_high', severity: 'medium', value: monitorSummary.avgLatencyMs });
    if (monitorSummary.rateLimitBlocks > 50) symptoms.push({ component: 'rateLimiter', type: 'throttling', severity: 'low', value: monitorSummary.rateLimitBlocks });
  }

  // 熔断器
  if (breakerStats?.openCount > 3) {
    symptoms.push({ component: 'circuitBreaker', type: 'multiple_breakers_open', severity: 'high', value: breakerStats.openCount });
  }

  // Redis
  if (redisMetrics?.down) {
    symptoms.push({ component: 'redis', type: 'unavailable', severity: 'critical', value: 1 });
  } else if (redisMetrics?.highLatency > 100) {
    symptoms.push({ component: 'redis', type: 'high_latency', severity: 'medium', value: redisMetrics.highLatency });
  }

  // DB
  if (dbMetrics?.down) {
    symptoms.push({ component: 'db', type: 'unavailable', severity: 'critical', value: 1 });
  } else if (dbMetrics?.activeConnections > dbMetrics?.connectionLimit * 0.8) {
    symptoms.push({ component: 'db', type: 'connection_pool_near_limit', severity: 'medium', value: dbMetrics.activeConnections });
  }

  return inferRootCause(symptoms);
}

/**
 * 事件关联分析：将同一时间窗口内的多个事件聚合为根因
 */
export function correlateIncidents(incidents, windowMs = 300000) {
  if (!incidents || incidents.length < 2) return null;

  const now = Date.now();
  const recent = incidents.filter(i => {
    const ts = new Date(i.created_at || i.createdAt).getTime();
    return now - ts < windowMs;
  });

  if (recent.length < 2) return null;

  const allSymptoms = recent.flatMap(i => {
    const s = i.symptoms || {};
    return Object.entries(s).map(([k, v]) => ({ component: k, type: 'from_incident', severity: 'medium', value: v }));
  });

  return inferRootCause(allSymptoms);
}

export { DEPENDENCY_GRAPH, REVERSE_DEPENDENCY };
export default { inferRootCause, aggregateAlerts, correlateIncidents, DEPENDENCY_GRAPH };
