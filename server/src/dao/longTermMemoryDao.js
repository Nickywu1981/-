import db from './db.js';

export async function insertEntry(data) {
  const [result] = await db.execute(
    `INSERT INTO ltm_entries
      (namespace, subject_id, memory_key, content, content_hash,
       importance, memory_type, source, tags, metadata, is_pinned, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.namespace, data.subjectId, data.memoryKey, data.content, data.contentHash,
     data.importance, data.memoryType, data.source, JSON.stringify(data.tags || []),
     JSON.stringify(data.metadata || {}), data.isPinned ? 1 : 0, data.expiresAt || null]
  );
  return result.insertId;
}

export async function upsertEntry(data) {
  const [result] = await db.execute(
    `INSERT INTO ltm_entries
      (namespace, subject_id, memory_key, content, content_hash,
       importance, memory_type, source, tags, metadata, is_pinned, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       importance = GREATEST(importance, VALUES(importance)),
       frequency = frequency + 1, access_count = access_count + 1,
       last_accessed_at = NOW(), updated_at = NOW()`,
    [data.namespace, data.subjectId, data.memoryKey, data.content, data.contentHash,
     data.importance, data.memoryType, data.source, JSON.stringify(data.tags || []),
     JSON.stringify(data.metadata || {}), data.isPinned ? 1 : 0, data.expiresAt || null]
  );
  return result.insertId;
}

export async function recallEntries({ namespace, subjectId, topK = 5, memoryType, minImportance = 0.1 }) {
  let sql = `SELECT id, memory_key, content, importance, recency_score,
      memory_type, tags, metadata, is_pinned,
      DATEDIFF(NOW(), COALESCE(last_accessed_at, created_at)) AS days_since_access
    FROM ltm_entries WHERE namespace = ? AND subject_id = ? AND importance >= ?
      AND (expires_at IS NULL OR expires_at > NOW())`;
  const params = [namespace, subjectId, minImportance];
  if (memoryType) { sql += ' AND memory_type = ?'; params.push(memoryType); }
  sql += ' ORDER BY is_pinned DESC, importance * recency_score DESC LIMIT ?';
  params.push(topK);
  const [rows] = await db.execute(sql, params);
  return rows;
}

export async function getMemoryStats(namespace, subjectId) {
  const [[{ total }], [byType]] = await Promise.all([
    db.execute(`SELECT COUNT(*) AS total FROM ltm_entries WHERE namespace = ? AND subject_id = ?`, [namespace, subjectId]),
    db.execute(`SELECT memory_type, COUNT(*) AS count FROM ltm_entries WHERE namespace = ? AND subject_id = ? GROUP BY memory_type`, [namespace, subjectId]),
  ]);
  return { entries: total, byType: byType.reduce((acc, r) => { acc[r.memory_type] = r.count; return acc; }, {}) };
}

export async function updateDecay(namespace, subjectId) {
  await db.execute(
    `UPDATE ltm_entries SET recency_score = GREATEST(0.01,
       recency_score * EXP(-decay_rate * GREATEST(DATEDIFF(NOW(), COALESCE(last_accessed_at, created_at)), 0)))
     WHERE namespace = ? AND subject_id = ? AND is_pinned = 0
       AND COALESCE(last_accessed_at, created_at) < DATE_SUB(NOW(), INTERVAL 1 DAY)`,
    [namespace, subjectId]
  );
}

export async function getCandidatesForConsolidation({ namespace, subjectId, memoryType, limit = 20 }) {
  let sql = `SELECT id, content, importance, memory_type FROM ltm_entries
    WHERE namespace = ? AND subject_id = ? AND is_pinned = 0 AND importance < 0.6
      AND recency_score < 0.5 AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)`;
  const params = [namespace, subjectId];
  if (memoryType) { sql += ' AND memory_type = ?'; params.push(memoryType); }
  sql += ' ORDER BY importance ASC, recency_score ASC LIMIT ?';
  params.push(limit);
  const [rows] = await db.execute(sql, params);
  return rows;
}

export async function markConsolidated(sourceIds, targetId) {
  const placeholders = sourceIds.map(() => '?').join(',');
  await db.execute(`UPDATE ltm_entries SET is_consolidated = 1, consolidated_to = ? WHERE id IN (${placeholders})`, [targetId, ...sourceIds]);
}

export async function markAccessed(memoryId) {
  await db.execute(`UPDATE ltm_entries SET access_count = access_count + 1, last_accessed_at = NOW() WHERE id = ?`, [memoryId]);
}

export async function purgeExpiredEntries() {
  const [result] = await db.execute(`DELETE FROM ltm_entries WHERE expires_at IS NOT NULL AND expires_at < NOW()`);
  return result.affectedRows;
}
