/**
 * Movio AI v4.2 — Model Config DAO
 * P4: AI 模型配置 CRUD + 调用日志
 */
import { tenantPool } from './tenantPool.js';
import { als } from './context.js';

function _db() { return als.getStore()?.db || tenantPool; }

// ============ 模型配置 CRUD ============

export async function listAll(includeDisabled = false) {
  const sql = includeDisabled
    ? 'SELECT * FROM ai_model_config ORDER BY priority DESC'
    : 'SELECT * FROM ai_model_config WHERE enabled = 1 ORDER BY priority DESC';
  const [rows] = await _db().query(sql);
  return rows;
}

export async function getByKey(modelKey) {
  const [rows] = await _db().query(
    'SELECT * FROM ai_model_config WHERE model_key = ?', [modelKey],
  );
  return rows[0] || null;
}

export async function getByVendorAndCategory(vendor, category) {
  const [rows] = await _db().query(
    'SELECT * FROM ai_model_config WHERE vendor = ? AND category = ? AND enabled = 1 ORDER BY priority DESC',
    [vendor, category],
  );
  return rows;
}

export async function create(data) {
  const [result] = await _db().query(
    `INSERT INTO ai_model_config (model_key, display_name, vendor, category, endpoint, api_key_enc, model_id, max_tokens, priority, enabled, rate_limit_rpm, rate_limit_rpd, concurrency_max, breaker_threshold, breaker_cooldown_s, moderation_enabled, moderation_action, blocked_words)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.model_key, data.display_name, data.vendor, data.category, data.endpoint, data.api_key_enc, data.model_id || '', data.max_tokens || 4096, data.priority || 0, data.enabled ?? 1, data.rate_limit_rpm || 60, data.rate_limit_rpd || 1000, data.concurrency_max || 5, data.breaker_threshold || 5, data.breaker_cooldown_s || 60, data.moderation_enabled ?? 1, data.moderation_action || 'block', data.blocked_words || null],
  );
  return { id: result.insertId, ...data };
}

export async function update(modelKey, data) {
  const fields = [];
  const params = [];
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) { fields.push(`${k} = ?`); params.push(v); }
  }
  if (fields.length === 0) return null;
  params.push(modelKey);
  const [result] = await _db().query(
    `UPDATE ai_model_config SET ${fields.join(', ')} WHERE model_key = ?`, params,
  );
  return result.affectedRows > 0 ? { model_key: modelKey, ...data } : null;
}

export async function remove(modelKey) {
  const [result] = await _db().query(
    'DELETE FROM ai_model_config WHERE model_key = ?', [modelKey],
  );
  return result.affectedRows > 0;
}

export async function toggle(modelKey, enabled) {
  const [result] = await _db().query(
    'UPDATE ai_model_config SET enabled = ? WHERE model_key = ?', [enabled ? 1 : 0, modelKey],
  );
  return result.affectedRows > 0;
}

// ============ 用量更新 ============

export async function incrementUsage(modelKey, { latencyMs = 0, tokensIn = 0, tokensOut = 0, isError = false }) {
  await _db().query(
    `UPDATE ai_model_config SET
       total_calls = total_calls + 1,
       total_tokens = total_tokens + ?,
       total_errors = total_errors + ?,
       avg_latency_ms = ROUND((avg_latency_ms * (total_calls - 1) + ?) / GREATEST(total_calls, 1))
     WHERE model_key = ?`,
    [tokensIn + tokensOut, isError ? 1 : 0, latencyMs, modelKey],
  );
}

// ============ 调用日志 ============

export async function logCall({ userId, tenantId, modelKey, taskType, inputHash, status, latencyMs, tokensIn, tokensOut, errorMsg, moderationResult }) {
  const [result] = await _db().query(
    `INSERT INTO ai_call_log (user_id, tenant_id, model_key, task_type, input_hash, status, latency_ms, tokens_in, tokens_out, error_msg, moderation_result)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId || null, tenantId || null, modelKey, taskType, inputHash || '', status || 'success', latencyMs || 0, tokensIn || 0, tokensOut || 0, errorMsg || '', moderationResult ? JSON.stringify(moderationResult) : null],
  );
  return result.insertId;
}

export async function queryCallLogs({ userId, modelKey, status, days = 7, offset = 0, limit = 50 }) {
  const conditions = ['1=1'];
  const params = [];
  if (userId) { conditions.push('user_id = ?'); params.push(userId); }
  if (modelKey) { conditions.push('model_key = ?'); params.push(modelKey); }
  if (status) { conditions.push('status = ?'); params.push(status); }
  conditions.push(`created_at >= DATE_SUB(NOW(), INTERVAL ${parseInt(days)} DAY)`);
  const [rows] = await _db().query(
    `SELECT * FROM ai_call_log WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), parseInt(offset)],
  );
  const [[{ total }]] = await _db().query(
    `SELECT COUNT(*) as total FROM ai_call_log WHERE ${conditions.join(' AND ')}`, params,
  );
  return { rows, total };
}

export async function getCallStats(modelKey, days = 7) {
  const [rows] = await _db().query(
    `SELECT
       COUNT(*) as total_calls,
       SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
       SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count,
       AVG(latency_ms) as avg_latency,
       SUM(tokens_in + tokens_out) as total_tokens
     FROM ai_call_log
     WHERE model_key = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
    [modelKey, days],
  );
  return rows[0] || {};
}
