import pool from '../dao/db.js';

// ==================== AI 调用日志 ====================

export async function logAiCall({ userId, modelId, modelName, prompt, promptTokens, responseTokens, totalTokens, durationMs, status, errorMsg, resultType, resultPreview, taskId }) {
  const [r] = await pool.execute(
    'INSERT INTO ai_call_log (user_id, model_id, model_name, prompt, prompt_tokens, response_tokens, total_tokens, duration_ms, status, error_msg, result_type, result_preview, task_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
    [userId, modelId, modelName || '', prompt || '', promptTokens || 0, responseTokens || 0, totalTokens || 0, durationMs || 0, status ?? 1, errorMsg || '', resultType || '', resultPreview || '', taskId || ''],
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
  const offset = (page - 1) * pageSize;
  const limit = pageSize;
  params.push(offset, limit);
  const [rows] = await pool.query(
    `SELECT id, user_id, model_id, model_name, prompt_tokens, response_tokens, total_tokens, duration_ms, status, result_type, result_preview, task_id, create_time FROM ai_call_log ${where} ORDER BY create_time DESC LIMIT ?, ?`,
    params,
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM ai_call_log ${where}`, params);
  return { list: rows, total };
}

export async function getAiCallStats() {
  const [rows] = await pool.query(
    'SELECT DATE(create_time) AS dt, COUNT(*) AS total_calls, SUM(CASE WHEN status=1 THEN 1 ELSE 0 END) AS success_calls, AVG(duration_ms) AS avg_duration, SUM(total_tokens) AS total_tokens FROM ai_call_log WHERE create_time >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY dt ORDER BY dt DESC LIMIT 30',
  );
  return rows;
}

// ==================== 操作日志 ====================

export async function logOperation({ userId, action, targetType, targetId, detail, ip, userAgent }) {
  const [r] = await pool.execute(
    'INSERT INTO operation_log (user_id, action, target_type, target_id, detail, ip, user_agent) VALUES (?,?,?,?,?,?,?)',
    [userId || null, action, targetType, String(targetId || ''), JSON.stringify(detail || {}), ip || '', userAgent || ''],
  );
  return r.insertId;
}

export async function listOperationLogs({ userId, action, page = 1, pageSize = 20 }) {
  const conditions = [];
  const params = [];
  if (userId) { conditions.push('user_id = ?'); params.push(userId); }
  if (action) { conditions.push('action = ?'); params.push(action); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * pageSize;
  const limit = pageSize;
  params.push(offset, limit);
  const [rows] = await pool.query(`SELECT * FROM operation_log ${where} ORDER BY create_time DESC LIMIT ?, ?`, params);
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM operation_log ${where}`, params);
  return { list: rows, total };
}

// ==================== 生成记录 ====================

export async function saveGeneratedImage({ userId, taskId, type, platform, originalUrl, resultUrl, thumbnailUrl, width, height, fileSize, format, params }) {
  const [r] = await pool.execute(
    'INSERT INTO generated_image (user_id, task_id, type, platform, original_url, result_url, thumbnail_url, width, height, file_size, format, params_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    [userId, taskId, type, platform, originalUrl, resultUrl, thumbnailUrl || resultUrl, width || 0, height || 0, fileSize || 0, format || 'webp', JSON.stringify(params || {})],
  );
  return r.insertId;
}

export async function saveGeneratedVideo({ userId, taskId, type, platform, originalUrl, resultUrl, thumbnailUrl, duration, width, height, fileSize, hasBgm, hasSubtitle, params }) {
  const [r] = await pool.execute(
    'INSERT INTO generated_video (user_id, task_id, type, platform, original_url, result_url, thumbnail_url, duration, width, height, file_size, has_bgm, has_subtitle, params_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    [userId, taskId, type, platform, originalUrl, resultUrl, thumbnailUrl || resultUrl, duration || 0, width || 0, height || 0, fileSize || 0, hasBgm ? 1 : 0, hasSubtitle ? 1 : 0, JSON.stringify(params || {})],
  );
  return r.insertId;
}

export async function listGeneratedImages(userId, { page = 1, pageSize = 20 }) {
  const [rows] = await pool.query(`SELECT * FROM generated_image WHERE user_id = ? ORDER BY create_time DESC LIMIT ?, ?`, [userId, (page - 1) * pageSize, pageSize]);
  const [[{ total }]] = await pool.execute('SELECT COUNT(*) AS total FROM generated_image WHERE user_id = ?', [userId]);
  return { list: rows, total };
}

export async function listGeneratedVideos(userId, { page = 1, pageSize = 20 }) {
  const [rows] = await pool.query(`SELECT * FROM generated_video WHERE user_id = ? ORDER BY create_time DESC LIMIT ?, ?`, [userId, (page - 1) * pageSize, pageSize]);
  const [[{ total }]] = await pool.execute('SELECT COUNT(*) AS total FROM generated_video WHERE user_id = ?', [userId]);
  return { list: rows, total };
}
