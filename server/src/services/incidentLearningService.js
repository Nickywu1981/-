/**
 * 事件学习引擎 (Incident Learning Engine)
 *
 * 自愈系统自进化的核心：记录→提取→排名→进化
 *
 * 核心流程：
 *   recordIncident() → extractRecurringPatterns() → rankStrategies() → evolveStrategy()
 *
 * L1→L2→L3→L3+ 策略进化路径：
 *   L1 反应式: 同类型触发 5 次 → 升级到 L2
 *   L2 主动式: 成功率 > 80% 且使用 > 20 次 → 升级到 L3
 *   L3 预测式: 相似症状群 > 10 次且无现有策略匹配 → L3+ 自创
 */

import * as dao from '../dao/healingIncidentDao.js';
import * as ltmService from './longTermMemoryService.js';
import logger from '../utils/logger.js';

// ==================== 事件记录 ====================

export async function recordIncident({
  incidentType, severity = 'medium', symptoms = {},
  affectedModels = null, rootCause = null,
  actionTaken, actionResult = 'success', recoveryTimeMs = 0,
  actionDetail = null, contextSnapshot = null,
}) {
  try {
    const id = await dao.createIncident({
      incidentType, severity, symptoms, affectedModels, rootCause,
      actionTaken, actionResult, recoveryTimeMs, actionDetail, contextSnapshot,
    });

    // 联动 LangMemE：将严重事件写入系统记忆
    if (severity === 'high' || severity === 'critical' || actionResult === 'failed') {
      ltmService.store({
        namespace: 'system', subjectId: 'healing',
        memoryKey: `incident_${incidentType}_${Date.now()}`,
        content: JSON.stringify({ incidentType, symptoms, actionTaken, actionResult, recoveryTimeMs }),
        memoryType: 'pattern',
        importance: severity === 'critical' ? 0.9 : 0.6,
        source: 'incident_learning',
        tags: ['healing', incidentType, actionResult],
        metadata: { incidentId: id },
      }).catch(e => logger.warn('[IncidentLearning] LTM store failed', { error: e.message }));
    }

    logger.info('[IncidentLearning] Recorded', { id, incidentType, actionResult });
    return id;
  } catch (err) {
    logger.error('[IncidentLearning] Record failed:', err.message);
    return null;
  }
}

// ==================== 模式提取 ====================

export async function extractRecurringPatterns(days = 30) {
  try {
    const clusters = await dao.getPatternClusters(days);
    const patterns = [];

    for (const c of clusters) {
      if (c.frequency < 2) continue;

      const successRate = c.frequency > 0 ? c.successes / c.frequency : 0;
      patterns.push({
        patternId: `pattern_${c.incident_type}_${(c.root_cause || 'unknown').replace(/[^a-z0-9]/gi, '_')}`,
        incidentType: c.incident_type,
        rootCause: c.root_cause,
        frequency: c.frequency,
        successRate: Math.round(successRate * 100) / 100,
        avgRecoveryMs: Math.round(c.avg_recovery_ms),
        recommendedAction: successRate >= 0.8 ? 'auto' : 'review',
      });
    }

    // 联动 LangMemE：将高频模式沉淀为系统规则
    for (const p of patterns) {
      if (p.frequency >= 3) {
        ltmService.store({
          namespace: 'system', subjectId: 'healing',
          memoryKey: `learned_pattern_${p.patternId}`,
          content: `自愈模式: ${p.incidentType} 根因=${p.rootCause} 频率=${p.frequency}次 成功率=${p.successRate} 建议动作=${p.recommendedAction}`,
          memoryType: 'rule',
          importance: Math.min(p.successRate + 0.2, 0.9),
          source: 'incident_pattern',
          tags: ['healing', 'learned_pattern', p.incidentType],
          metadata: p,
        }).catch(e => logger.warn('[IncidentLearning] Pattern LTM store failed', { error: e.message }));
      }
    }

    logger.info('[IncidentLearning] Patterns extracted', { count: patterns.length, days });
    return patterns;
  } catch (err) {
    logger.error('[IncidentLearning] Pattern extraction failed:', err.message);
    return [];
  }
}

// ==================== 策略排名 ====================

export async function rankStrategies(incidentType) {
  try {
    const strategies = await dao.getStrategies(incidentType);
    return strategies
      .map(s => ({
        ...s,
        weightedScore: (s.success_rate || 0) * (s.total_count || 0) / Math.max(s.activation_count || 1, 1),
      }))
      .sort((a, b) => b.weightedScore - a.weightedScore);
  } catch (err) {
    logger.error('[IncidentLearning] Rank strategies failed:', err.message);
    return [];
  }
}

// ==================== 策略进化 ====================

const EVOLUTION_THRESHOLDS = {
  L1: { nextLevel: 'L2', activationCount: 5, successRate: 0, totalCount: 0 },
  L2: { nextLevel: 'L3', activationCount: 0, successRate: 0.8, totalCount: 20 },
  L3: { nextLevel: 'L3+', activationCount: 10, successRate: 0.85, totalCount: 50 },
};

const _evolvingStrategies = new Set(); // per-strategy lock to prevent race

export async function evolveStrategy(strategyId) {
  if (_evolvingStrategies.has(strategyId)) return { evolved: false, reason: 'Already being evolved' };
  _evolvingStrategies.add(strategyId);
  try {
    const strategy = await dao.getStrategy(strategyId);
    if (!strategy) return null;

    const threshold = EVOLUTION_THRESHOLDS[strategy.strategyLevel];
    if (!threshold) return { evolved: false, reason: `Level ${strategy.strategyLevel} 已达最高级` };

    const canEvolve =
      (threshold.activationCount > 0 && strategy.activation_count >= threshold.activationCount) ||
      (threshold.successRate > 0 && strategy.success_rate >= threshold.successRate && strategy.total_count >= threshold.totalCount);

    if (!canEvolve) {
      return {
        evolved: false,
        reason: `不满足升级条件: 需 activation=${threshold.activationCount} successRate=${threshold.successRate} totalCount=${threshold.totalCount}`,
        current: { activationCount: strategy.activation_count, successRate: strategy.success_rate, totalCount: strategy.total_count },
      };
    }

    // 升级到下一级（使用新 strategyId 保留旧记录）
    const newStrategyId = `${strategyId}_L${threshold.nextLevel}_${Date.now()}`;
    await dao.upsertStrategy({
      ...strategy,
      strategyId: newStrategyId,
      strategyLevel: threshold.nextLevel,
      successCount: 0,   // 新级别重新计数
      totalCount: 0,
      successRate: 0,
      activationCount: 0,
      evolvedFrom: strategyId,
    });

    // 旧策略标记为非活跃（仅更新 isActive，不覆盖其他字段）
    await dao.upsertStrategy({ strategyId, strategyLevel: strategy.strategy_level || 'L1', isActive: false });

    logger.info('[IncidentLearning] Strategy evolved', {
      strategyId, from: strategy.strategyLevel, to: threshold.nextLevel,
    });

    // 联动 LangMemE
    ltmService.store({
      namespace: 'system', subjectId: 'healing',
      memoryKey: `strategy_evolved_${strategyId}_${Date.now()}`,
      content: `策略升级: ${strategyId} ${strategy.strategyLevel}→${threshold.nextLevel} 原名=${strategy.incidentType}`,
      memoryType: 'decision',
      importance: 0.7,
      source: 'strategy_evolution',
      tags: ['healing', 'evolution', threshold.nextLevel],
    }).catch(e => logger.warn('[IncidentLearning] LTM strategy store skipped', { error: e.message }));

    return { evolved: true, from: strategy.strategyLevel, to: threshold.nextLevel, strategyId };
  } catch (err) {
    logger.error('[IncidentLearning] Evolve strategy failed:', err.message);
    return null;
  } finally {
    _evolvingStrategies.delete(strategyId);
  }
}

/**
 * 全量自进化 Tick：提取模式 → 排名 → 升级合格策略
 */
export async function evolutionTick() {
  const start = Date.now();
  const patterns = await extractRecurringPatterns(30);
  let evolved = 0;

  for (const p of patterns) {
    const strategies = await rankStrategies(p.incidentType);
    for (const s of strategies) {
      if (s.strategyLevel !== 'L3+' && s.strategyLevel !== 'L3') {
        const result = await evolveStrategy(s.strategy_id);
        if (result?.evolved) evolved++;
      }
    }
  }

  logger.info('[IncidentLearning] Evolution tick done', {
    patterns: patterns.length, evolved, ms: Date.now() - start,
  });

  return { patterns, evolved, ms: Date.now() - start };
}

/**
 * 初始化种子策略（首次运行时调用）
 */
export async function seedDefaultStrategies() {
  const defaults = [
    { strategyId: 'breaker_reset_basic', level: 'L1', type: 'breaker_open', action: { type: 'breaker_reset', params: {} } },
    { strategyId: 'model_recover_basic', level: 'L1', type: 'model_down', action: { type: 'health_ping_recover', params: { threshold: 3 } } },
    { strategyId: 'weight_reduce_basic', level: 'L1', type: 'latency_spike', action: { type: 'reduce_weight', params: { factor: 0.5 } } },
    { strategyId: 'fallback_basic', level: 'L1', type: 'model_error', action: { type: 'try_fallback', params: { maxRetries: 3 } } },
    { strategyId: 'connection_pool_flush', level: 'L1', type: 'connection_leak', action: { type: 'flush_idle_connections', params: {} } },
    { strategyId: 'redis_fallback_memory', level: 'L1', type: 'redis_down', action: { type: 'enable_memory_fallback', params: {} } },
  ];

  for (const d of defaults) {
    const exists = await dao.getStrategy(d.strategyId);
    if (!exists) {
      await dao.upsertStrategy({
        strategyId: d.strategyId,
        strategyLevel: d.level,
        incidentType: d.type,
        actionTemplate: d.action,
      });
    }
  }

  logger.info('[IncidentLearning] Seed strategies done');
}

export default { recordIncident, extractRecurringPatterns, rankStrategies, evolveStrategy, evolutionTick, seedDefaultStrategies };
