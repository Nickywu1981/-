import db from './db.js';

export async function upsertEntry(data) {
  const hasEmbedding = data.embedding !== undefined && data.embedding !== null;
  const sql = hasEmbedding
    ? `INSERT INTO ltm_entries
        (namespace, subject_id, memory_key, content, content_hash,
         importance, memory_type, source, tags, metadata, is_pinned, expires_at,
         embedding, embedding_model)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         importance = GREATEST(importance, VALUES(importance)),
         frequency = frequency + 1, access_count = access_count + 1,
         embedding = COALESCE(VALUES(embedding), embedding),
         embedding_model = COALESCE(VALUES(embedding_model), embedding_model),
         last_accessed_at = NOW(), updated_at = NOW()`
    : `INSERT INTO ltm_entries
        (namespace, subject_id, memory_key, content, content_hash,
         importance, memory_type, source, tags, metadata, is_pinned, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         importance = GREATEST(importance, VALUES(importance)),
         frequency = frequency + 1, access_count = access_count + 1,
         last_accessed_at = NOW(), updated_at = NOW()`;
  const params = hasEmbedding
    ? [data.namespace, data.subjectId, data.memoryKey, data.content, data.contentHash,
       data.importance, data.memoryType, data.source, JSON.stringify(data.tags || []),
       JSON.stringify(data.metadata || {}), data.isPinned ? 1 : 0, data.expiresAt || null,
       JSON.stringify(data.embedding), data.embeddingModel || 'tfidf-local']
    : [data.namespace, data.subjectId, data.memoryKey, data.content, data.contentHash,
       data.importance, data.memoryType, data.source, JSON.stringify(data.tags || []),
       JSON.stringify(data.metadata || {}), data.isPinned ? 1 : 0, data.expiresAt || null];
  const [result] = await db.execute(sql, params);
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

/** 余弦相似度 */
function _cosineSimilarity(a, b) {
  if (!a || !b) return 0;
  let dot = 0, normA = 0, normB = 0;
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of allKeys) {
    const va = a[k] || 0, vb = b[k] || 0;
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 基于 embedding 向量余弦相似度的语义召回
 * @returns {Promise<Array>} 带 _similarity 字段的记忆条目
 */
export async function recallByEmbedding({ namespace, subjectId, embedding, topK = 5, memoryType, minImportance = 0.1 }) {
  const candidates = await recallEntries({ namespace, subjectId, topK: 200, memoryType, minImportance });

  const withEmbedding = candidates.filter(c => c.metadata);
  const parsed = withEmbedding.map(c => {
    let emb = null;
    try {
      const meta = typeof c.metadata === 'string' ? JSON.parse(c.metadata) : (c.metadata || {});
      emb = meta._embedding || null;
    } catch { /* ignore */ }
    return { ...c, _embedding: emb };
  }).filter(c => c._embedding && Object.keys(c._embedding).length > 0);

  if (parsed.length === 0) return [];

  const scored = parsed.map(c => ({
    ...c,
    _similarity: Math.round(_cosineSimilarity(embedding, c._embedding) * 10000) / 10000,
  }));

  scored.sort((a, b) => b._similarity - a._similarity);
  const qualified = scored.filter(c => c._similarity >= 0.20);
  return qualified.slice(0, topK);
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

/**
 * 艾宾浩斯记忆衰减：分段衰减速率 × 节省效应
 *   1h内=0.50, 1天内=0.74, 1-7天=0.04, 7-31天=0.006, >31天=0.001
 *   savingsFactor = max(0.3, 1 - recallCount * 0.15)
 */
export async function applyEbbinghausDecay(namespace, subjectId) {
  await db.execute(
    `UPDATE ltm_entries SET recency_score = GREATEST(0.01,
       recency_score * EXP(
         CASE
           WHEN DATEDIFF(NOW(), COALESCE(last_accessed_at, created_at)) < 1 THEN -0.74
           WHEN DATEDIFF(NOW(), COALESCE(last_accessed_at, created_at)) < 7 THEN -0.04
           WHEN DATEDIFF(NOW(), COALESCE(last_accessed_at, created_at)) < 31 THEN -0.006
           ELSE -0.001
         END
         * GREATEST(DATEDIFF(NOW(), COALESCE(last_accessed_at, created_at)), 0)
         * GREATEST(0.3, 1.0 - access_count * 0.15)
       ))
     WHERE namespace = ? AND subject_id = ? AND is_pinned = 0`,
    [namespace, subjectId]
  );
}

/** 召回强化：提升 importance + recency_score */
export async function reinforceRecall(memoryId) {
  await db.execute(
    `UPDATE ltm_entries SET
       importance = LEAST(1.0, importance + 0.05),
       recency_score = LEAST(1.0, recency_score + 0.08),
       access_count = access_count + 1,
       last_accessed_at = NOW()
     WHERE id = ?`,
    [memoryId]
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
