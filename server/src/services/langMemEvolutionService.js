/**
 * LangMemE 自进化引擎
 *
 * 从长期记忆中自动提取模式 → 生成规则 → 追踪进化指标
 * 实现：观测→学习→进化 的自我优化闭环
 *
 * 核心流程：
 *   extractPatterns() → autoGenerateRules() → 规则注入 ltmEnhancer.buildMemoryInjection()
 *   _evolutionTick() 定时触发全量进化循环
 */

import * as ltmDao from '../dao/longTermMemoryDao.js';
import * as memoryEmbedService from './memoryEmbedService.js';
import * as ltmService from './longTermMemoryService.js';
import logger from '../utils/logger.js';

// ==================== 进化指标计数器 ====================
const _evolutionMetrics = {
  evolutionsRun: 0,
  patternsDiscovered: 0,
  rulesGenerated: 0,
  rulesHit: 0,
  totalMemories: 0,
  activeRules: 0,
  lastEvolution: null,
};

// 规则命中计数 (内存键: ruleId → hitCount)
const _ruleHitCounters = new Map();

// ==================== Tokenizer ====================

function tokenize(text) {
  if (!text) return [];
  const tokens = [];
  // 中文 bigram
  const cleaned = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ').trim();
  for (let i = 0; i < cleaned.length - 1; i++) {
    const pair = cleaned.slice(i, i + 2);
    if (/[\u4e00-\u9fa5]/.test(pair) || pair.trim().length === 2) {
      tokens.push(pair);
    }
  }
  // 英文单词
  const words = cleaned.match(/[a-zA-Z]+/g);
  if (words) tokens.push(...words.map(w => w.toLowerCase()));
  return tokens;
}

function tfidfVector(documents) {
  // 构建词频矩阵
  const docTokens = documents.map(tokenize);
  const df = new Map(); // document frequency
  for (const tokens of docTokens) {
    const seen = new Set(tokens);
    for (const t of seen) {
      df.set(t, (df.get(t) || 0) + 1);
    }
  }
  const N = documents.length;
  const idf = new Map();
  for (const [t, d] of df) {
    idf.set(t, Math.log((N + 1) / (d + 1)) + 1);
  }
  return docTokens.map((tokens) => {
    const tf = new Map();
    for (const t of tokens) {
      tf.set(t, (tf.get(t) || 0) + 1);
    }
    const vector = {};
    for (const [t, f] of tf) {
      vector[t] = f * (idf.get(t) || 0);
    }
    return vector;
  });
}

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of allKeys) {
    const va = a[k] || 0;
    const vb = b[k] || 0;
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ==================== 模式提取 ====================

/**
 * 从记忆池中提取高频模式
 * @returns {Array} [{ patternType, keywords, examples, confidence, support }]
 */
export async function extractPatterns({ namespace = 'user', subjectId, topK = 50, minSupport = 2 }) {
  try {
    // 拉取近期记忆
    const memories = await ltmDao.recallEntries({
      namespace, subjectId, topK, minImportance: 0.1,
    });

    if (memories.length < 3) return [];

    // 按 memoryType 聚类
    const clusters = new Map();
    for (const mem of memories) {
      const type = mem.memory_type || 'fact';
      if (!clusters.has(type)) clusters.set(type, []);
      clusters.get(type).push(mem.content.slice(0, 500));
    }

    const patterns = [];

    for (const [type, contents] of clusters) {
      if (contents.length < minSupport) continue;

      // TF-IDF 提取关键词
      const vectors = tfidfVector(contents);
      const avgVector = {};
      for (const vec of vectors) {
        for (const [k, v] of Object.entries(vec)) {
          avgVector[k] = (avgVector[k] || 0) + v / vectors.length;
        }
      }

      // 关键词按权重排序
      const keywords = Object.entries(avgVector)
        .filter(([, v]) => v > 0.5)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([k]) => k);

      if (keywords.length < 2) continue;

      // 找到示例内容
      const examples = contents.slice(0, 3).map(c => c.slice(0, 120));

      // 计算置信度：基于关键词集中度
      const confidence = Math.min(
        Math.round((keywords.length / 8) * (contents.length / minSupport) * 100) / 100,
        1.0
      );

      patterns.push({
        patternType: type,
        keywords,
        examples,
        confidence,
        support: contents.length,
      });
    }

    // 跨类型相关性检测
    if (patterns.length > 0) {
      _evolutionMetrics.patternsDiscovered += patterns.length;
    }

    logger.info('[LangMemE] Patterns extracted', {
      namespace, subjectId, patternCount: patterns.length,
    });

    return patterns;
  } catch (err) {
    logger.error('[LangMemE] extractPatterns failed:', err.message);
    return [];
  }
}

// ==================== 规则自动生成 ====================

/**
 * 从高置信度模式自动生成规则，写入 ltm_entries (memoryType='rule')
 * @returns {Array} 生成的新规则
 */
export async function autoGenerateRules({ namespace = 'user', subjectId, minSupport = 3 }) {
  try {
    const patterns = await extractPatterns({ namespace, subjectId, minSupport });
    if (patterns.length === 0) return [];

    const generatedRules = [];

    for (const p of patterns) {
      if (p.confidence < 0.6 || p.support < minSupport) continue;

      // 确定规则类型
      let ruleType = 'default_preference';
      if (p.patternType === 'preference') ruleType = 'default_preference';
      else if (p.patternType === 'decision') ruleType = 'auto_style';
      else if (p.patternType === 'pattern') ruleType = 'platform_preference';

      const ruleContent = JSON.stringify({
        ruleType,
        keywords: p.keywords,
        confidence: p.confidence,
        support: p.support,
        generatedAt: new Date().toISOString(),
        examples: p.examples.slice(0, 2),
      });

      const id = await ltmService.store({
        namespace,
        subjectId,
        memoryKey: `rule_${ruleType}_${Date.now()}`,
        content: ruleContent,
        memoryType: 'rule',
        importance: Math.min(p.confidence + 0.2, 1.0),
        source: 'langmem_evolution',
        tags: ['auto_generated', 'evolution', p.patternType],
        metadata: {
          patternType: p.patternType,
          confidence: p.confidence,
          support: p.support,
        },
        isPinned: p.confidence > 0.85,
      });

      if (id) {
        generatedRules.push({ id, ruleType, keywords: p.keywords, confidence: p.confidence });
        _evolutionMetrics.rulesGenerated++;
      }
    }

    logger.info('[LangMemE] Rules auto-generated', {
      namespace, subjectId, ruleCount: generatedRules.length,
    });

    return generatedRules;
  } catch (err) {
    logger.error('[LangMemE] autoGenerateRules failed:', err.message);
    return [];
  }
}

// ==================== 进化指标追踪 ====================

export function getEvolutionMetrics() {
  return {
    ..._evolutionMetrics,
    rulesHit: _evolutionMetrics.rulesHit + [..._ruleHitCounters.values()].reduce((s, v) => s + v, 0),
    activeRules: _ruleHitCounters.size,
    lastEvolution: _evolutionMetrics.lastEvolution,
  };
}

export function recordRuleHit(ruleId) {
  if (!ruleId) return;
  _ruleHitCounters.set(ruleId, (_ruleHitCounters.get(ruleId) || 0) + 1);
  _evolutionMetrics.rulesHit++;
}

// ==================== 进化循环 ====================

/**
 * 单次进化 Tick：拉取全局热点 namespace
 */
export async function evolutionTick(subjectIds, namespace = 'user') {
  const start = Date.now();
  _evolutionMetrics.evolutionsRun++;
  let totalPatterns = 0;
  let totalRules = 0;

  for (const subjectId of (Array.isArray(subjectIds) ? subjectIds : [subjectIds])) {
    try {
      // 应用记忆衰减
      await ltmService.applyDecay({ namespace, subjectId });

      // 提取模式并生成规则
      const rules = await autoGenerateRules({ namespace, subjectId, minSupport: 3 });
      totalRules += rules.length;

      // 记忆合并去碎片
      await ltmService.consolidate({ namespace, subjectId, maxEntries: 30 });
    } catch (e) {
      logger.warn('[LangMemE] Evolution tick failed for subject', { subjectId, error: e.message });
    }
  }

  _evolutionMetrics.lastEvolution = new Date().toISOString();

  // 更新全局统计
  try {
    const allMemories = await ltmDao.recallEntries({ namespace, subjectId: '%', topK: 1, minImportance: 0 });
    _evolutionMetrics.totalMemories = allMemories.length;
  } catch (e) { logger.warn('[LangMemE] Memory stats retrieval failed', { error: e.message }); }

  const elapsed = Date.now() - start;
  logger.info('[LangMemE] Evolution tick completed', {
    subjectCount: Array.isArray(subjectIds) ? subjectIds.length : 1,
    totalPatterns, totalRules, elapsedMs: elapsed,
  });

  return {
    evolved: true,
    subjectCount: Array.isArray(subjectIds) ? subjectIds.length : 1,
    patternsFound: totalPatterns,
    rulesGenerated: totalRules,
    elapsedMs: elapsed,
    metrics: getEvolutionMetrics(),
  };
}

/**
 * 获取活跃用户列表（有近期记忆的用户 subject_id）
 */
export async function getActiveSubjects(namespace = 'user', limit = 50) {
  try {
    const memories = await ltmDao.recallEntries({
      namespace, subjectId: '%', topK: 500, minImportance: 0,
    });
    const subjectSet = new Set(memories.map(m => m.subject_id).filter(Boolean));
    return [...subjectSet].slice(0, limit);
  } catch (e) {
    logger.warn('[LangMemE] getActiveSubjects failed', { error: e.message, namespace });
    return [];
  }
}

/**
 * 全量进化循环：对所有活跃用户执行进化
 */
export async function fullEvolutionCycle(namespace = 'user') {
  const subjects = await getActiveSubjects(namespace);
  if (subjects.length === 0) {
    logger.info('[LangMemE] No active subjects for evolution');
    return { evolved: false, reason: 'No active subjects' };
  }

  return evolutionTick(subjects, namespace);
}

export default {
  extractPatterns, autoGenerateRules,
  getEvolutionMetrics, recordRuleHit,
  evolutionTick, fullEvolutionCycle, getActiveSubjects,
};
