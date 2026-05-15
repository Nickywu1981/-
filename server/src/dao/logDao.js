import pool from './db.js';
import { parsePagination } from '../utils/pagination.js';

// ==================== ai_call_log ====================

export async function insertAiCallLog({ userId, tenantId, modelId, modelName, prompt, promptTokens, responseTokens, totalTokens, durationMs, status, errorMsg, resultType, resultPreview, taskId }) {
  const [r] = await pool.query(
    'INSERT INTO ?? (user_id, tenant_id, model_id, model_name, prompt, prompt_tokens, response_tokens, total_tokens, duration_ms, status, error_msg, result_type, result_preview, task_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    ['ai_call_log', userId, tenantId || 0, modelId, modelName || '', prompt || '', promptTokens || 0, responseTokens || 0, totalTokens || 0, durationMs || 0, status ?? 1, errorMsg || '', resultType || '', resultPreview || '', taskId || ''],
  );
  return r.insertId;
}

export async function listAiCallLogs({ userId, modelId, status, page = 1, pageSize = 20 }) {
  const conditions = [];
  const params = [];
  if (userId) { conditions.push('user_id = ?'); params.push(userId); }
  if (modelId) { conditions.push('model_id = ?'); params.push(modelId); }
  if (status !== undefined) { conditions.push('status = ?'); params.push(status); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { offset } = parsePagination({ page, pageSize });
  const [rows] = await pool.query(
    `SELECT id, user_id, model_id, model_name, prompt_tokens, response_tokens, total_tokens, duration_ms, status, result_type, result_preview, task_id, create_time FROM ?? ${where} ORDER BY create_time DESC LIMIT ? OFFSET ?`,
    ['ai_call_log', ...params, pageSize, offset],
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM ?? ${where}`,
    ['ai_call_log', ...params],
  );
  return { list: rows, total };
}

export async function getAiCallDailyStats(days = 30) {
  const [rows] = await pool.query(
    `SELECT DATE(create_time) AS dt, COUNT(*) AS total_calls,
            SUM(CASE WHEN status=1 THEN 1 ELSE 0 END) AS success_calls,
            AVG(duration_ms) AS avg_duration, SUM(total_tokens) AS total_tokens
     FROM ?? WHERE create_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
     GROUP BY dt ORDER BY dt DESC LIMIT ?`,
    ['ai_call_log', days, days],
  );
  return rows;
}

export async function getAiCallStats() {
  const [[{ total }]] = await pool.query(
    'SELECT COUNT(*) as total FROM ?? WHERE create_time >= DATE_SUB(NOW(), INTERVAL 90 DAY)',
    ['ai_call_log'],
  );
  const [[{ today }]] = await pool.query('SELECT COUNT(*) as today FROM ?? WHERE DATE(create_time) = CURDATE()', ['ai_call_log']);
  const [[{ totalCost }]] = await pool.query('SELECT COALESCE(SUM(cost), 0) as totalCost FROM ??', ['ai_call_log']);
  return { total, today, totalCost };
}

// ==================== operation_log ====================

export async function insertOperationLog({ userId, action, targetType, targetId, detail, ip, userAgent }) {
  const [r] = await pool.query(
    'INSERT INTO ?? (user_id, action, target_type, target_id, detail, ip, user_agent) VALUES (?,?,?,?,?,?,?)',
    ['operation_log', userId || null, action, targetType, String(targetId || ''), JSON.stringify(detail || {}), ip || '', userAgent || ''],
  );
  return r.insertId;
}

export async function listOperationLogs({ userId, action, page = 1, pageSize = 20 }) {
  const conditions = [];
  const params = [];
  if (userId) { conditions.push('user_id = ?'); params.push(userId); }
  if (action) { conditions.push('action = ?'); params.push(action); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { offset } = parsePagination({ page, pageSize });
  const [rows] = await pool.query(
    `SELECT id, user_id, action, target_type, target_id, detail, ip, user_agent, create_time FROM ?? ${where} ORDER BY create_time DESC LIMIT ? OFFSET ?`,
    ['operation_log', ...params, pageSize, offset],
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM ?? ${where}`,
    ['operation_log', ...params],
  );
  return { list: rows, total };
}

export async function getFunnelMetrics(days = 30) {
  const [[row]] = await pool.query(
    `SELECT
      COUNT(DISTINCT CASE WHEN action = 'register' THEN user_id END) as registrations,
      COUNT(DISTINCT CASE WHEN action = 'first_upload' THEN user_id END) as first_uploads,
      COUNT(DISTINCT CASE WHEN action = 'first_generate' THEN user_id END) as first_generates,
      COUNT(DISTINCT CASE WHEN action = 'payment_success' THEN user_id END) as payments
     FROM ?? WHERE create_time >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
    ['operation_log', days],
  );
  return row;
}

export async function getActiveUserCounts() {
  const [[dau]] = await pool.query(
    `SELECT COUNT(DISTINCT user_id) as count FROM ??
     WHERE create_time >= CURDATE() AND user_id IS NOT NULL`,
    ['operation_log'],
  );
  const [[mau]] = await pool.query(
    `SELECT COUNT(DISTINCT user_id) as count FROM ??
     WHERE create_time >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND user_id IS NOT NULL`,
    ['operation_log'],
  );
  return { dau: Number(dau.count), mau: Number(mau.count) };
}

export async function getTopTools(days = 7, limit = 10) {
  const [rows] = await pool.query(
    `SELECT target_type as tool, COUNT(*) as count
     FROM ?? WHERE action = 'tool_use' AND create_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
     GROUP BY target_type ORDER BY count DESC LIMIT ?`,
    ['operation_log', days, limit],
  );
  return rows;
}

export async function getDailyTrend(days = 30) {
  const [rows] = await pool.query(
    `SELECT DATE(create_time) as date,
            COUNT(DISTINCT CASE WHEN action = 'register' THEN user_id END) as registrations,
            COUNT(DISTINCT CASE WHEN action = 'first_generate' THEN user_id END) as generates,
            COUNT(DISTINCT CASE WHEN action = 'payment_success' THEN user_id END) as payments
     FROM ?? WHERE create_time >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY DATE(create_time) ORDER BY date ASC`,
    ['operation_log', days],
  );
  return rows;
}

export async function getConversionFunnel(days = 30) {
  const [[row]] = await pool.query(
    `SELECT
      COUNT(DISTINCT CASE WHEN action = 'page_view' THEN user_id END) as landing,
      COUNT(DISTINCT CASE WHEN action = 'register' THEN user_id END) as registered,
      COUNT(DISTINCT CASE WHEN action = 'first_generate' THEN user_id END) as activated,
      COUNT(DISTINCT CASE WHEN action = 'payment_success' THEN user_id END) as paid,
      COUNT(DISTINCT CASE WHEN action = 'repeat_use' AND create_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN user_id END) as retained
     FROM ?? WHERE create_time >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
    ['operation_log', days],
  );
  return row;
}

// ==================== generated_image ====================

export async function insertGeneratedImage({ userId, taskId, type, platform, originalUrl, resultUrl, thumbnailUrl, width, height, fileSize, format, params }) {
  const [r] = await pool.query(
    'INSERT INTO ?? (user_id, task_id, type, platform, original_url, result_url, thumbnail_url, width, height, file_size, format, params_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    ['generated_image', userId, taskId, type, platform, originalUrl, resultUrl, thumbnailUrl || resultUrl, width || 0, height || 0, fileSize || 0, format || 'webp', JSON.stringify(params || {})],
  );
  return r.insertId;
}

export async function listGeneratedImages(userId, { page = 1, pageSize = 20 }) {
  const { offset } = parsePagination({ page, pageSize });
  const [rows] = await pool.query(
    'SELECT id, user_id, task_id, type, platform, original_url, result_url, thumbnail_url, width, height, file_size, format, params_json, create_time FROM ?? WHERE user_id = ? ORDER BY create_time DESC LIMIT ? OFFSET ?',
    ['generated_image', userId, pageSize, offset],
  );
  const [[{ total }]] = await pool.query(
    'SELECT COUNT(*) AS total FROM ?? WHERE user_id = ?',
    ['generated_image', userId],
  );
  return { list: rows, total };
}

// ==================== generated_video ====================

export async function insertGeneratedVideo({ userId, taskId, type, platform, originalUrl, resultUrl, thumbnailUrl, duration, width, height, fileSize, hasBgm, hasSubtitle, params }) {
  const [r] = await pool.query(
    'INSERT INTO ?? (user_id, task_id, type, platform, original_url, result_url, thumbnail_url, duration, width, height, file_size, has_bgm, has_subtitle, params_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    ['generated_video', userId, taskId, type, platform, originalUrl, resultUrl, thumbnailUrl || resultUrl, duration || 0, width || 0, height || 0, fileSize || 0, hasBgm ? 1 : 0, hasSubtitle ? 1 : 0, JSON.stringify(params || {})],
  );
  return r.insertId;
}

export async function listGeneratedVideos(userId, { page = 1, pageSize = 20 }) {
  const { offset } = parsePagination({ page, pageSize });
  const [rows] = await pool.query(
    'SELECT id, user_id, task_id, type, platform, original_url, result_url, thumbnail_url, duration, width, height, file_size, has_bgm, has_subtitle, params_json, create_time FROM ?? WHERE user_id = ? ORDER BY create_time DESC LIMIT ? OFFSET ?',
    ['generated_video', userId, pageSize, offset],
  );
  const [[{ total }]] = await pool.query(
    'SELECT COUNT(*) AS total FROM ?? WHERE user_id = ?',
    ['generated_video', userId],
  );
  return { list: rows, total };
}

// ==================== content_audit_log ====================

export async function insertContentAuditLog({ userId, jobId, auditStage, contentType, originalText, riskLevel, riskTags, action }) {
  const [r] = await pool.query(
    'INSERT INTO ?? (user_id, job_id, audit_stage, content_type, original_text, risk_level, risk_tags, action) VALUES (?,?,?,?,?,?,?,?)',
    ['content_audit_log', userId, jobId, auditStage, contentType, originalText?.substring?.(0, 2000) || originalText, riskLevel, JSON.stringify(riskTags || []), action],
  );
  return r.insertId;
}
