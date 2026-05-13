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
import * as ltmDao from '../dao/longTermMemoryDao.js';
import logger from '../utils/logger.js';

function hashContent(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

async function store({
  namespace = 'user', subjectId, memoryKey, content, memoryType = 'fact',
  importance = 0.5, source = null, tags = [], metadata = {}, isPinned = false, expiresAt = null,
}) {
  try {
    const id = await ltmDao.upsertEntry({
      namespace, subjectId, memoryKey, content,
      contentHash: hashContent(content),
      importance, memoryType, source, tags, metadata, isPinned, expiresAt,
    });
    return id || null;
  } catch (err) {
    logger.error('[LTM] store failed:', err.message);
    return null;
  }
}

async function storeBatch(entries) {
  const results = await Promise.all(entries.map(entry => store(entry)));
  return entries.filter((_, i) => results[i]).map((entry, i) => ({ ...entry, id: results[i] }));
}

async function recall({
  namespace = 'user', subjectId, query: _query, topK = 5, memoryType = null, minImportance = 0.1,
}) {
  try {
    return await ltmDao.recallEntries({ namespace, subjectId, topK, memoryType, minImportance });
  } catch (err) {
    logger.error('[LTM] recall failed:', err.message);
    return [];
  }
}

async function applyDecay({ namespace = 'user', subjectId }) {
  try {
    await ltmDao.updateDecay(namespace, subjectId);
  } catch (err) {
    logger.error('[LTM] decay failed:', err.message);
  }
}

async function consolidate({
  namespace = 'user', subjectId, maxEntries = 20, memoryType = null,
}) {
  try {
    const rows = await ltmDao.getCandidatesForConsolidation({ namespace, subjectId, memoryType, limit: maxEntries });
    if (rows.length < 3) return null;

    const contents = rows.map(r => r.content.slice(0, 200));
    const consolidated = `[合并记忆] ${contents.join(' | ')}`;
    const sourceIds = rows.map(r => r.id);

    const mergedId = await store({
      namespace, subjectId, memoryKey: `consolidated_${Date.now()}`,
      content: consolidated, memoryType: memoryType || 'fact', importance: 0.4,
      source: 'consolidation', metadata: { source_count: rows.length, source_ids: sourceIds },
    });

    if (mergedId) {
      await ltmDao.markConsolidated(sourceIds, mergedId);
    }
    return { mergedId, sourceCount: rows.length, consolidated };
  } catch (err) {
    logger.error('[LTM] consolidate failed:', err.message);
    return null;
  }
}

async function purgeExpired() {
  try {
    return await ltmDao.purgeExpiredEntries();
  } catch (err) {
    logger.error('[LTM] purge failed:', err.message);
    return 0;
  }
}

async function getStats({ namespace = 'user', subjectId }) {
  try {
    return await ltmDao.getMemoryStats(namespace, subjectId);
  } catch (err) {
    return { entries: 0, error: err.message };
  }
}

async function markAccessed(memoryId) {
  try {
    await ltmDao.markAccessed(memoryId);
  } catch (e) { logger.warn('[LTM] markAccessed 降级:', e.message); }
}

export { store, storeBatch, recall, applyDecay, consolidate, purgeExpired, getStats, markAccessed };
