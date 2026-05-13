/**
 * 反馈学习服务 (Feedback Learning Service)
 *
 * 将输出质量评分反向调整模型选择权重，形成自进化闭环：
 *   1. 数据采集 — 工作流完成后记录输出 + 自动评分
 *   2. 反馈写入 — 高分加分、低分减分，写入 LTM
 *   3. 周期性调整 — 批量处理后同步到模型池权重
 */
import logger from '../utils/logger.js';

// ==================== 自动评分维度 ====================

const SCORE_DIMENSIONS = {
  relevance: { weight: 0.40, label: '相关性' },
  completeness: { weight: 0.30, label: '完整度' },
  creativity: { weight: 0.30, label: '创意度' },
};

// ==================== 反馈缓冲区 ====================

const feedbackBuffer = [];
const MAX_BUFFER_SIZE = 200;
const BONUS_WEIGHT = 0.05;   // 高分模型权重增幅
const PENALTY_WEIGHT = 0.08; // 低分模型权重降幅
const HIGH_SCORE_THRESHOLD = 80;
const LOW_SCORE_THRESHOLD = 50;

// 每个模型的累计反馈
const modelFeedbackScores = new Map(); // modelKey → { totalScore, count, avgScore }
const feedbackMultipliers = new Map(); // modelKey → multiplier (default 1.0)

// ==================== 自动评分 ====================

/**
 * 使用 AI 对输出结果自动评分
 */
async function autoScore({ taskType, input, output, modelKey }) {
  try {
    const prompt = `评估以下AI输出质量，按三个维度打分(0-100):
1. relevance(相关性): 输出是否准确响应输入需求
2. completeness(完整度): 输出内容是否完整无遗漏
3. creativity(创意度): 输出是否有创新性

任务类型: ${taskType}
模型: ${modelKey}
输入摘要: ${JSON.stringify(input).substring(0, 300)}
输出摘要: ${JSON.stringify(output).substring(0, 500)}

请仅返回 JSON 格式: {"relevance": 数字, "completeness": 数字, "creativity": 数字}`;

    const { infer } = await import('./aiEngine.js');
    const result = await infer('gpt-4o-mini', prompt, { skipCache: true });
    const text = result?.output?.text || result?.output || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const scores = JSON.parse(match[0]);
      const weighted = Math.round(
        (scores.relevance || 50) * SCORE_DIMENSIONS.relevance.weight +
        (scores.completeness || 50) * SCORE_DIMENSIONS.completeness.weight +
        (scores.creativity || 50) * SCORE_DIMENSIONS.creativity.weight
      );
      return { scores, weighted, source: 'ai' };
    }
    return { scores: { relevance: 50, completeness: 50, creativity: 50 }, weighted: 50, source: 'fallback' };
  } catch (err) {
    logger.warn('[Feedback] Auto-score failed, using default', { modelKey, error: err.message });
    return { scores: { relevance: 50, completeness: 50, creativity: 50 }, weighted: 50, source: 'default' };
  }
}

// ==================== 记录反馈 ====================

/**
 * 记录一条反馈
 * @param {object} params
 * @param {string} params.jobId - 工作流ID
 * @param {string} params.modelKey - 使用的模型
 * @param {number} [params.explicitScore] - 用户显式评分 (0-100)
 * @param {string} [params.userId] - 用户ID
 * @param {object} [params.output] - 输出内容 (用于自动评分)
 * @param {string} [params.taskType] - 任务类型
 * @param {object} [params.input] - 输入参数
 */
export async function recordFeedback({ jobId, modelKey, explicitScore, userId, output, taskType, input }) {
  if (!modelKey) return null;

  let scoreData;
  if (explicitScore !== undefined && explicitScore !== null) {
    scoreData = { weighted: explicitScore, source: 'user' };
  } else if (output) {
    scoreData = await autoScore({ taskType, input, output, modelKey });
  } else {
    return null;
  }

  const entry = {
    jobId,
    modelKey,
    score: scoreData.weighted,
    scores: scoreData.scores || null,
    source: scoreData.source,
    userId: userId || 'system',
    timestamp: new Date().toISOString(),
  };

  // 更新内存统计
  const existing = modelFeedbackScores.get(modelKey) || { totalScore: 0, count: 0 };
  existing.totalScore += scoreData.weighted;
  existing.count += 1;
  existing.avgScore = Math.round(existing.totalScore / existing.count);
  modelFeedbackScores.set(modelKey, existing);

  // 入缓冲区
  feedbackBuffer.push(entry);
  if (feedbackBuffer.length > MAX_BUFFER_SIZE) {
    feedbackBuffer.shift();
  }

  // 异步写入 LTM
  try {
    const { store } = await import('./longTermMemoryService.js');
    store({
      namespace: 'feedback',
      subjectId: modelKey,
      memoryKey: `feedback_${jobId}_${Date.now()}`,
      content: JSON.stringify(entry),
      memoryType: 'feedback',
      importance: Math.abs(scoreData.weighted - 50) / 50,
      source: 'feedbackLearningService',
      tags: ['feedback', modelKey, scoreData.source],
      metadata: entry,
    }).catch((err) => logger.warn('[Feedback] LTM store failed', { error: err.message }));
  } catch (err) {
    logger.warn('[Feedback] LTM import failed', { error: err.message });
  }

  logger.debug('[Feedback] Recorded', { modelKey, score: scoreData.weighted, source: scoreData.source });
  return entry;
}

// ==================== 批量处理 ====================

/**
 * 批量处理反馈，调整模型权重
 * 高分(≥80) → 权重 +BONUS_WEIGHT
 * 低分(<50) → 权重 -PENALTY_WEIGHT
 */
export async function processFeedbackBatch() {
  if (modelFeedbackScores.size === 0) return { processed: 0, adjustments: [] };

  const adjustments = [];
  let processed = 0;

  try {
    const { getPool, updateModel } = await import('./modelPoolService.js');
    const pool = await getPool();

    for (const [modelKey, stats] of modelFeedbackScores) {
      if (stats.count < 3) continue; // 至少3条反馈才调整

      const model = pool.find(m => m.model_key === modelKey);
      if (!model) continue;

      const currentMultiplier = feedbackMultipliers.get(modelKey) || 1.0;
      let newMultiplier = currentMultiplier;

      if (stats.avgScore >= HIGH_SCORE_THRESHOLD) {
        newMultiplier = Math.min(1.5, currentMultiplier + BONUS_WEIGHT);
      } else if (stats.avgScore < LOW_SCORE_THRESHOLD) {
        newMultiplier = Math.max(0.3, currentMultiplier - PENALTY_WEIGHT);
      }

      if (Math.abs(newMultiplier - currentMultiplier) > 0.001) {
        feedbackMultipliers.set(modelKey, newMultiplier);
        const baseWeight = model.pool_weight || 1;
        const adjustedWeight = Math.max(1, Math.round(baseWeight * newMultiplier));

        try {
          await updateModel(modelKey, { pool_weight: adjustedWeight });
          adjustments.push({
            modelKey,
            oldMultiplier: currentMultiplier,
            newMultiplier,
            baseWeight,
            adjustedWeight,
            avgScore: stats.avgScore,
            sampleCount: stats.count,
          });
          logger.info('[Feedback] Weight adjusted', {
            modelKey, baseWeight, adjustedWeight,
            avgScore: stats.avgScore, multiplier: newMultiplier.toFixed(2),
          });
        } catch (err) {
          logger.warn('[Feedback] Weight update failed', { modelKey, error: err.message });
        }
      }

      processed++;
    }

    // 清理已处理的统计
    modelFeedbackScores.clear();
  } catch (err) {
    logger.error('[Feedback] Batch process failed', { error: err.message });
  }

  return { processed, adjustments };
}

// ==================== 权重查询 ====================

export function getFeedbackAdjustedWeight(modelKey) {
  return feedbackMultipliers.get(modelKey) || 1.0;
}

export function getFeedbackStats() {
  const stats = {};
  for (const [key, val] of modelFeedbackScores) {
    stats[key] = { ...val, multiplier: feedbackMultipliers.get(key) || 1.0 };
  }
  return {
    modelStats: stats,
    bufferSize: feedbackBuffer.length,
    multiplierCount: feedbackMultipliers.size,
  };
}

// ==================== 定时批处理 ====================

let _batchTimer = null;

export function startFeedbackLoop(intervalMs = 3600_000) {
  if (_batchTimer) return;
  _batchTimer = setInterval(async () => {
    try {
      const result = await processFeedbackBatch();
      if (result.adjustments.length > 0) {
        logger.info('[Feedback] Loop processed', { processed: result.processed, adjustments: result.adjustments.length });
      }
    } catch (err) {
      logger.warn('[Feedback] Loop iteration failed', { error: err.message });
    }
  }, intervalMs);
  if (_batchTimer && typeof _batchTimer.unref === 'function') _batchTimer.unref();
  logger.info('[Feedback] Loop started', { intervalMs });
}

export function stopFeedbackLoop() {
  if (_batchTimer) { clearInterval(_batchTimer); _batchTimer = null; }
  logger.info('[Feedback] Loop stopped');
}

export default { recordFeedback, processFeedbackBatch, getFeedbackAdjustedWeight, getFeedbackStats, startFeedbackLoop, stopFeedbackLoop };
