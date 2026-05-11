/**
 * Token Stats DAO — Token 聚合统计原子操作
 * UPSERT 模式：每次 AI 调用完成后实时更新多维聚合计数器
 */
import pool from './db.js';
import { als } from './context.js';

function _db() { return als.getStore()?.db || pool; }

// ============ 原子聚合写入 (UPSERT) ============

export async function incrementAggregation({ dimension, dimensionId, periodKey, callCount = 1, tokensIn = 0, tokensOut = 0, totalCost = 0, isError = false, latencyMs = 0 }) {
  const totalTokens = tokensIn + tokensOut;
  const [r] = await _db().query(
    `INSERT INTO ai_token_aggregation
       (dimension, dimension_id, period_key, call_count, tokens_in, tokens_out, total_tokens, total_cost, success_count, error_count, avg_latency_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       call_count     = call_count + VALUES(call_count),
       tokens_in       = tokens_in + VALUES(tokens_in),
       tokens_out      = tokens_out + VALUES(tokens_out),
       total_tokens    = total_tokens + VALUES(total_tokens),
       total_cost      = total_cost + VALUES(total_cost),
       success_count   = success_count + VALUES(success_count),
       error_count     = error_count + VALUES(error_count),
       avg_latency_ms  = ROUND((avg_latency_ms * call_count + VALUES(avg_latency_ms) * VALUES(call_count)) / (call_count + VALUES(call_count)), 2)`,
    [dimension, dimensionId, periodKey, callCount, tokensIn, tokensOut, totalTokens, totalCost, isError ? 0 : 1, isError ? 1 : 0, latencyMs || 0],
  );
  return r.affectedRows;
}

/**
 * 一次 AI 调用写入 6 个维度的聚合
 */
export async function incrementAllDimensions({ userId, tenantId, modelKey, taskType, source, tokensIn, tokensOut, cost, isError, latencyMs }) {
  const now = new Date();
  const dayKey = now.toISOString().slice(0, 10).replace(/-/g, '');
  const hourKey = dayKey + String(now.getHours()).padStart(2, '0');

  const jobs = [];

  if (userId) {
    jobs.push(incrementAggregation({ dimension: 'user', dimensionId: String(userId), periodKey: dayKey, tokensIn, tokensOut, totalCost: cost, isError, latencyMs }));
  }
  if (tenantId) {
    jobs.push(incrementAggregation({ dimension: 'tenant', dimensionId: String(tenantId), periodKey: dayKey, tokensIn, tokensOut, totalCost: cost, isError, latencyMs }));
  }
  if (modelKey) {
    jobs.push(incrementAggregation({ dimension: 'model', dimensionId: modelKey, periodKey: dayKey, tokensIn, tokensOut, totalCost: cost, isError, latencyMs }));
  }
  if (taskType) {
    jobs.push(incrementAggregation({ dimension: 'task_type', dimensionId: taskType, periodKey: dayKey, tokensIn, tokensOut, totalCost: cost, isError, latencyMs }));
  }
  if (source) {
    jobs.push(incrementAggregation({ dimension: 'source', dimensionId: source, periodKey: dayKey, tokensIn, tokensOut, totalCost: cost, isError, latencyMs }));
  }
  // 小时级统计
  jobs.push(incrementAggregation({ dimension: 'hourly', dimensionId: modelKey || 'unknown', periodKey: hourKey, tokensIn, tokensOut, totalCost: cost, isError, latencyMs }));

  await Promise.all(jobs);
}

// ============ 统计查询 ============

export async function getStats({ dimension, dimensionId, days = 7 }) {
  const [rows] = await _db().query(
    `SELECT period_key,
       SUM(call_count) as call_count,
       SUM(tokens_in) as tokens_in,
       SUM(tokens_out) as tokens_out,
       SUM(total_tokens) as total_tokens,
       SUM(total_cost) as total_cost,
       SUM(success_count) as success_count,
       SUM(error_count) as error_count
     FROM ai_token_aggregation
     WHERE dimension = ? AND dimension_id = ?
       AND period_key >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL ? DAY), '%Y%m%d')
     GROUP BY period_key
     ORDER BY period_key DESC`,
    [dimension, dimensionId, days],
  );
  return rows;
}

export async function getHourlyStats({ modelKey, hours = 24 }) {
  const [rows] = await _db().query(
    `SELECT period_key,
       SUM(call_count) as call_count,
       SUM(total_tokens) as total_tokens,
       SUM(total_cost) as total_cost
     FROM ai_token_aggregation
     WHERE dimension = 'hourly' AND dimension_id = ?
       AND period_key >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL ? HOUR), '%Y%m%d%H')
     GROUP BY period_key
     ORDER BY period_key DESC`,
    [modelKey, hours],
  );
  return rows;
}

export async function getCostByModel(days = 7) {
  const [rows] = await _db().query(
    `SELECT dimension_id as model_key,
       SUM(call_count) as call_count,
       SUM(total_tokens) as total_tokens,
       SUM(total_cost) as total_cost
     FROM ai_token_aggregation
     WHERE dimension = 'model'
       AND period_key >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL ? DAY), '%Y%m%d')
     GROUP BY dimension_id
     ORDER BY total_cost DESC`,
    [days],
  );
  return rows;
}

export async function getCostBySource(days = 7) {
  const [rows] = await _db().query(
    `SELECT dimension_id as source,
       SUM(call_count) as call_count,
       SUM(total_tokens) as total_tokens,
       SUM(total_cost) as total_cost
     FROM ai_token_aggregation
     WHERE dimension = 'source'
       AND period_key >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL ? DAY), '%Y%m%d')
     GROUP BY dimension_id
     ORDER BY total_cost DESC`,
    [days],
  );
  return rows;
}

export async function getDashboardSummary(days = 7) {
  const [[{ totalCalls, totalTokens, totalCost }]] = await _db().query(
    `SELECT
       SUM(call_count) as totalCalls,
       SUM(total_tokens) as totalTokens,
       SUM(total_cost) as totalCost
     FROM ai_token_aggregation
     WHERE dimension = 'hourly'
       AND period_key >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL ? DAY), '%Y%m%d%H')`,
    [days],
  );
  return { totalCalls: totalCalls || 0, totalTokens: totalTokens || 0, totalCost: totalCost || 0 };
}
