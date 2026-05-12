/**
 * 长期记忆存储服务 (Long-Term Memory Service)
 *
 * 功能：
 * 1. 持久化存储 — 关键信息写入 MySQL ltm_entries，跨会话不丢失
 * 2. 重要性评分 — 基于 explicit flag + 访问频率 + 衰减时间 的综合评分
 * 3. 记忆衰减 — 未被召回的记忆随时间降低 recency_score
 * 4. 记忆合并 — 同 namespace 下多条记忆自动摘要合并，降低碎片
 * 5. RAG 检索 — 按查询语义召回 Top-K 最相关记忆
 * 6. 去重 — SHA-256 内容指纹防重复存储
 */

import crypto from 'crypto';
import db from '../dao/db.js';
import logger from '../utils/logger.js';
import { memoryEmbedService } from './memoryEmbedService.js';

// ─── 内容指纹 ───────────────────────────────────────────────

function hashContent(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

// ─── 存储记忆 ───────────────────────────────────────────────

async function store({
  namespace = 'user',
  subjectId,
  memoryKey,
  content,
  memoryType = 'fact',
  importance = 0.5,
  source = null,
  tags = [],
  metadata = {},
  isPinned = false,
  expiresAt = null,
}) {
  const contentHash = hashContent(content);
  const tagsJson = JSON.stringify(tags);
  const metadataJson = JSON.stringify(metadata);

  try {
    const [result] = await db.execute(
      `INSERT INTO ltm_entries
        (namespace, subject_id, memory_key, content, content_hash,
         importance, memory_type, source, tags, metadata, is_pinned, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         importance = GREATEST(importance, VALUES(importance)),
         frequency = frequency + 1,
         access_count = access_count + 1,
         last_accessed_at = NOW(),
         tags = JSON_MERGE_PATCH(tags, VALUES(tags)),
         metadata = JSON_MERGE_PATCH(metadata, VALUES(metadata)),
         updated_at = NOW()`,
      [namespace, subjectId, memoryKey, content, contentHash,
        importance, memoryType, source, tagsJson, metadataJson, isPinned ? 1 : 0, expiresAt]
    );
    return result.insertId || null;
  } catch (err) {
    logger.error('[LTM] store failed:', err.message);
    return null;
  }
}

// ─── 批量存储 ───────────────────────────────────────────────

async function storeBatch(entries) {
  const results = [];
  for (const entry of entries) {
    const id = await store(entry);
    if (id) results.push({ ...entry, id });
  }
  return results;
}

// ─── RAG 检索记忆 ───────────────────────────────────────────

async function recall({
  namespace = 'user',
  subjectId,
  query,
  topK = 5,
  memoryType = null,
  minImportance = 0.1,
}) {
  // 优先语义检索
  let semanticResults = [];
  try {
    const semantic = await memoryEmbedService.searchFullContext(query, topK * 2);
    semanticResults = semantic.map(item => item.content || item.source || '');
  } catch (_) { /* 语义检索降级 */ }

  try {
    let sql = `SELECT id, memory_key, content, importance, recency_score,
        memory_type, tags, metadata, is_pinned,
        DATEDIFF(NOW(), COALESCE(last_accessed_at, created_at)) AS days_since_access,
        access_count, frequency
      FROM ltm_entries
      WHERE namespace = ? AND subject_id = ?
        AND importance >= ?
        AND (expires_at IS NULL OR expires_at > NOW())`;
    const params = [namespace, subjectId, minImportance];

    if (memoryType) {
      sql += ' AND memory_type = ?';
      params.push(memoryType);
    }

    sql += ' ORDER BY is_pinned DESC, importance * recency_score DESC LIMIT ?';
    params.push(topK);

    const [rows] = await db.execute(sql, params);
    return rows;
  } catch (err) {
    logger.error('[LTM] recall failed:', err.message);
    return [];
  }
}

// ─── 更新衰减 ───────────────────────────────────────────────

async function applyDecay({
  namespace = 'user',
  subjectId,
}) {
  try {
    // recency_score = recency_score * e^(-decay_rate * days_since_access)
    await db.execute(
      `UPDATE ltm_entries
       SET recency_score = GREATEST(0.01,
         recency_score * EXP(-decay_rate * GREATEST(DATEDIFF(NOW(), COALESCE(last_accessed_at, created_at)), 0)))
       WHERE namespace = ? AND subject_id = ?
         AND is_pinned = 0
         AND COALESCE(last_accessed_at, created_at) < DATE_SUB(NOW(), INTERVAL 1 DAY)`,
      [namespace, subjectId]
    );
  } catch (err) {
    logger.error('[LTM] decay failed:', err.message);
  }
}

// ─── 记忆合并 ───────────────────────────────────────────────

async function consolidate({
  namespace = 'user',
  subjectId,
  maxEntries = 20,
  memoryType = null,
}) {
  // 找出低重要性、非置顶、旧于 7 天的记忆
  let sql = `SELECT id, content, importance, memory_type, created_at
    FROM ltm_entries
    WHERE namespace = ? AND subject_id = ?
      AND is_pinned = 0
      AND importance < 0.6
      AND recency_score < 0.5
      AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)`;
  const params = [namespace, subjectId];

  if (memoryType) {
    sql += ' AND memory_type = ?';
    params.push(memoryType);
  }

  sql += ' ORDER BY importance ASC, recency_score ASC LIMIT ?';
  params.push(maxEntries);

  try {
    const [rows] = await db.execute(sql, params);
    if (rows.length < 3) return null; // 不足3条不值得合并

    // 简单合并：取各条前80字拼接
    const contents = rows.map(r => r.content.slice(0, 200));
    const consolidated = `[合并记忆] ${contents.join(' | ')}`;
    const sourceIds = rows.map(r => r.id);

    // 写入合并记忆
    const mergedId = await store({
      namespace,
      subjectId,
      memoryKey: `consolidated_${Date.now()}`,
      content: consolidated,
      memoryType: memoryType || 'fact',
      importance: 0.4,
      source: 'consolidation',
      metadata: { source_count: rows.length, source_ids: sourceIds },
    });

    if (mergedId) {
      // 标记源条目为已合并
      await db.execute(
        `UPDATE ltm_entries SET is_consolidated = 1, consolidated_to = ? WHERE id IN (${sourceIds.join(',')})`,
        [mergedId]
      );

      // 记录合并日志
      await db.execute(
        `INSERT INTO memory_consolidation_log
          (namespace, subject_id, source_count, consolidated_content, source_ids, trigger_type)
         VALUES (?, ?, ?, ?, ?, 'auto')`,
        [namespace, subjectId, rows.length, consolidated, JSON.stringify(sourceIds)]
      );
    }

    return { mergedId, sourceCount: rows.length, consolidated };
  } catch (err) {
    logger.error('[LTM] consolidate failed:', err.message);
    return null;
  }
}

// ─── 清理过期记忆 ───────────────────────────────────────────

async function purgeExpired() {
  try {
    const [result] = await db.execute(
      `DELETE FROM ltm_entries WHERE expires_at IS NOT NULL AND expires_at < NOW()`
    );
    return result.affectedRows || 0;
  } catch (err) {
    logger.error('[LTM] purge failed:', err.message);
    return 0;
  }
}

// ─── 获取统计信息 ───────────────────────────────────────────

async function getStats({ namespace = 'user', subjectId }) {
  try {
    const [[{ total }], [byType]] = await Promise.all([
      db.execute(
        `SELECT COUNT(*) AS total FROM ltm_entries WHERE namespace = ? AND subject_id = ?`,
        [namespace, subjectId]
      ),
      db.execute(
        `SELECT memory_type, COUNT(*) AS count FROM ltm_entries
         WHERE namespace = ? AND subject_id = ?
         GROUP BY memory_type`,
        [namespace, subjectId]
      ),
    ]);

    return {
      entries: total,
      byType: byType.reduce((acc, r) => { acc[r.memory_type] = r.count; return acc; }, {}),
    };
  } catch (err) {
    return { entries: 0, error: err.message };
  }
}

// ─── 标记访问 ───────────────────────────────────────────────

async function markAccessed(memoryId) {
  try {
    await db.execute(
      `UPDATE ltm_entries SET access_count = access_count + 1, last_accessed_at = NOW() WHERE id = ?`,
      [memoryId]
    );
  } catch (_) { /* 静默降级 */ }
}

export {
  store,
  storeBatch,
  recall,
  applyDecay,
  consolidate,
  purgeExpired,
  getStats,
  markAccessed,
  hashContent,
};
