/**
 * A/B 实验数据层
 */
import db from './db.js';

export async function create(experiment) {
  const sql = `INSERT INTO ab_experiments (name, description, status, variants, metrics, target_type, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)`;
  const [result] = await db.execute(sql, [
    experiment.name, experiment.description || null,
    experiment.status || 'draft',
    JSON.stringify(experiment.variants || []),
    JSON.stringify(experiment.metrics || []),
    experiment.targetType || 'model',
    experiment.createdBy || null,
  ]);
  return { id: result.insertId, ...experiment };
}

export async function getById(id) {
  const [rows] = await db.execute('SELECT id, name, description, status, variants, metrics, target_type, start_at, end_at, created_by, created_at, updated_at FROM ab_experiments WHERE id = ?', [id]);
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    ...row,
    variants: typeof row.variants === 'string' ? JSON.parse(row.variants) : row.variants,
    metrics: typeof row.metrics === 'string' ? JSON.parse(row.metrics) : row.metrics,
  };
}

export async function list(options = {}) {
  const { status, limit = 50, offset = 0 } = options;
  let sql = 'SELECT id, name, description, status, variants, metrics, target_type, start_at, end_at, created_by, created_at, updated_at FROM ab_experiments WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));
  const [rows] = await db.execute(sql, params);
  return rows.map(row => ({
    ...row,
    variants: typeof row.variants === 'string' ? JSON.parse(row.variants) : row.variants,
    metrics: typeof row.metrics === 'string' ? JSON.parse(row.metrics) : row.metrics,
  }));
}

const ALLOWED_COLUMNS = ['name', 'description', 'type', 'target_type', 'target_id', 'status', 'variants', 'metrics', 'start_time', 'end_time'];

export async function update(id, data) {
  const sets = [];
  const params = [];
  for (const [k, v] of Object.entries(data)) {
    const col = k.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
    if (!ALLOWED_COLUMNS.includes(col)) continue;
    if (['variants', 'metrics'].includes(col)) {
      sets.push(`${col} = ?`);
      params.push(JSON.stringify(v));
    } else {
      sets.push(`${col} = ?`);
      params.push(v);
    }
  }
  if (sets.length === 0) return false;
  params.push(id);
  const [result] = await db.execute(`UPDATE ab_experiments SET ${sets.join(', ')} WHERE id = ?`, params);
  return result.affectedRows > 0;
}

export async function remove(id) {
  const [result] = await db.execute('DELETE FROM ab_experiments WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

// ==================== 事件日志 ====================

export async function logEvent({ experimentId, variantId, metricId, value, sessionId, userId, metadata }) {
  const sql = `INSERT INTO ab_event_log (experiment_id, variant_id, metric_id, value, session_id, user_id, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?)`;
  const [result] = await db.execute(sql, [
    experimentId, variantId, metricId, value,
    sessionId || null, userId || null, metadata ? JSON.stringify(metadata) : null,
  ]);
  return result.insertId;
}

export async function getEventStats(experimentId, days = 7) {
  const [rows] = await db.execute(
    `SELECT variant_id, metric_id,
      COUNT(*) AS count, AVG(value) AS mean, STDDEV(value) AS stddev,
      MIN(value) AS min, MAX(value) AS max
     FROM ab_event_log
     WHERE experiment_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
     GROUP BY variant_id, metric_id
     ORDER BY variant_id, metric_id`,
    [experimentId, days]
  );
  return rows;
}
