/**
 * 自愈事件知识库 DAO
 */
import db from './db.js';

// ==================== 事件 CRUD ====================

export async function createIncident(data) {
  const sql = `INSERT INTO healing_incidents
    (incident_type, severity, symptoms, affected_models, root_cause, action_taken, action_result, recovery_time_ms, action_detail, context_snapshot, learned_pattern)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const [result] = await db.execute(sql, [
    data.incidentType, data.severity || 'medium',
    JSON.stringify(data.symptoms || {}),
    data.affectedModels ? JSON.stringify(data.affectedModels) : null,
    data.rootCause || null,
    data.actionTaken,
    data.actionResult || 'success',
    data.recoveryTimeMs || 0,
    data.actionDetail ? JSON.stringify(data.actionDetail) : null,
    data.contextSnapshot ? JSON.stringify(data.contextSnapshot) : null,
    data.learnedPattern || null,
  ]);
  return result.insertId;
}

export async function listIncidents({ incidentType, limit = 50, offset = 0, days = 7 } = {}) {
  let sql = 'SELECT * FROM healing_incidents WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
  const params = [days];
  if (incidentType) { sql += ' AND incident_type = ?'; params.push(incidentType); }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  const [rows] = await db.execute(sql, params);
  return rows.map(r => ({
    ...r,
    symptoms: safeJSON(r.symptoms),
    affectedModels: safeJSON(r.affected_models),
    actionDetail: safeJSON(r.action_detail),
    contextSnapshot: safeJSON(r.context_snapshot),
  }));
}

export async function getIncidentStats(days = 7) {
  const [rows] = await db.execute(
    `SELECT incident_type, action_result, COUNT(*) AS cnt, AVG(recovery_time_ms) AS avg_ms
     FROM healing_incidents WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
     GROUP BY incident_type, action_result ORDER BY incident_type, action_result`,
    [days]
  );
  return rows;
}

export async function getPatternClusters(days = 30) {
  const [rows] = await db.execute(
    `SELECT incident_type, root_cause, COUNT(*) AS frequency,
      SUM(CASE WHEN action_result='success' THEN 1 ELSE 0 END) AS successes,
      AVG(recovery_time_ms) AS avg_recovery_ms
     FROM healing_incidents WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) AND root_cause IS NOT NULL
     GROUP BY incident_type, root_cause HAVING frequency >= 2 ORDER BY frequency DESC`,
    [days]
  );
  return rows;
}

// ==================== 策略 CRUD ====================

export async function upsertStrategy(data) {
  const sql = `INSERT INTO healing_strategies
    (strategy_id, strategy_level, incident_type, action_template, success_count, total_count, success_rate, activation_count, evolved_from, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      success_count = VALUES(success_count), total_count = VALUES(total_count),
      success_rate = VALUES(success_rate), activation_count = VALUES(activation_count),
      strategy_level = VALUES(strategy_level), is_active = VALUES(is_active),
      updated_at = NOW()`;
  await db.execute(sql, [
    data.strategyId, data.strategyLevel || 'L1', data.incidentType,
    JSON.stringify(data.actionTemplate || {}),
    data.successCount || 0, data.totalCount || 0,
    data.successRate || 0, data.activationCount || 0,
    data.evolvedFrom || null, data.isActive !== false ? 1 : 0,
  ]);
}

export async function getStrategies(incidentType) {
  let sql = 'SELECT * FROM healing_strategies WHERE is_active = 1';
  const params = [];
  if (incidentType) { sql += ' AND incident_type = ?'; params.push(incidentType); }
  sql += ' ORDER BY strategy_level DESC, success_rate DESC';
  const [rows] = await db.execute(sql, params);
  return rows.map(r => ({ ...r, actionTemplate: safeJSON(r.action_template) }));
}

export async function getStrategy(id) {
  const [rows] = await db.execute('SELECT * FROM healing_strategies WHERE strategy_id = ?', [id]);
  if (rows.length === 0) return null;
  const r = rows[0];
  return { ...r, actionTemplate: safeJSON(r.action_template) };
}

// ==================== 辅助 ====================

function safeJSON(v) {
  if (!v) return null;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return v; }
}

export default { createIncident, listIncidents, getIncidentStats, getPatternClusters, upsertStrategy, getStrategies, getStrategy };
