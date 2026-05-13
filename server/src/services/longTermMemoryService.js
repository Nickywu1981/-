import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';

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
import { embed as embedText } from './memoryEmbedService.js';
import logger from '../utils/logger.js';

function hashContent(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

async function store({
  namespace = 'user', subjectId, memoryKey, content, memoryType = 'fact',
  importance = 0.5, source = null, tags = [], metadata = {}, isPinned = false, expiresAt = null,
}) {
  try {
    let embedding = null;
    let embeddingModel = null;
    try {
      const embResult = await embedText(content);
      embedding = embResult.vector;
      embeddingModel = embResult.model;
    } catch (e) {
      logger.warn('[LTM] embed failed, storing without embedding', { error: e.message });
    }

    const enrichedMeta = { ...metadata };
    if (embedding) {
      enrichedMeta._embedding = embedding;
      enrichedMeta._embedding_model = embeddingModel;
    }

    const id = await ltmDao.upsertEntry({
      namespace, subjectId, memoryKey, content,
      contentHash: hashContent(content),
      importance, memoryType, source, tags, metadata: enrichedMeta, isPinned, expiresAt,
      embedding, embeddingModel,
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
  namespace = 'user', subjectId, query, topK = 5, memoryType = null, minImportance = 0.1,
}) {
  try {
    // 优先语义召回
    if (query) {
      const semantic = await semanticRecall({ namespace, subjectId, query, topK, memoryType, minImportance });
      if (semantic.length > 0) return semantic;
    }
    // 回退关键词 SQL
    return await ltmDao.recallEntries({ namespace, subjectId, topK, memoryType, minImportance });
  } catch (err) {
    logger.error('[LTM] recall failed:', err.message);
    return [];
  }
}

/**
 * 语义召回：embed query → 余弦相似度排序 → Top-K
 */
async function semanticRecall({ namespace = 'user', subjectId, query, topK = 5, memoryType = null, minImportance = 0.1 }) {
  try {
    const { vector: queryVec } = await embedText(query);
    if (!queryVec || Object.keys(queryVec).length === 0) return [];
    return await ltmDao.recallByEmbedding({ namespace, subjectId, embedding: queryVec, topK, memoryType, minImportance });
  } catch (err) {
    logger.warn('[LTM] semanticRecall failed, fallback to keyword', { error: err.message });
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
    const sourceIds = rows.map(r => r.id);

    // AI 摘要合并，失败时回退字符串拼接
    let consolidated;
    try {
      const { infer } = await import('./aiEngine.js');
      const prompt = `合并以下${rows.length}条相关记忆为一条简洁摘要（保留关键事实，去掉冗余）：\n${rows.map((r, i) => `${i + 1}. ${r.content.slice(0, 300)}`).join('\n')}\n只返回合并后的一段文字，不超过300字。`;
      const result = await infer('deepseek-chat', [{ role: 'user', content: prompt }], { temperature: 0.3, maxTokens: 400 });
      consolidated = (typeof result === 'string' ? result : result?.text || result?.content || '').trim();
      if (!consolidated) throw new BusinessError(ERROR_CODE.AI_INFER_FAILED, 'empty AI response');
    } catch (aiErr) {
      logger.warn('[LTM] AI consolidate failed, fallback to string concat', { error: aiErr.message });
      consolidated = `[合并记忆] ${contents.join(' | ')}`;
    }

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

export { store, storeBatch, recall, semanticRecall, applyDecay, consolidate, purgeExpired, getStats, markAccessed };
