import * as ltmService from '../services/longTermMemoryService.js';

export async function storeMemory(req, res) {
  try {
    const { namespace = 'user', subjectId, memoryKey, content, memoryType, importance, source, tags, metadata, isPinned, expiresAt } = req.body;
    if (!subjectId || !content) return res.status(400).json({ error: 'subjectId and content are required' });

    const id = await ltmService.store({
      namespace, subjectId, memoryKey: memoryKey || `auto_${Date.now()}`,
      content, memoryType, importance, source, tags, metadata, isPinned, expiresAt,
    });

    res.json({ success: true, data: { id } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function batchStoreMemory(req, res) {
  try {
    const { entries } = req.body;
    if (!Array.isArray(entries) || entries.length === 0) return res.status(400).json({ error: 'entries array required' });
    const results = await ltmService.storeBatch(entries);
    res.json({ success: true, data: { stored: results.length, items: results } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function recallMemory(req, res) {
  try {
    const { namespace = 'user', subjectId, query, topK = 5, memoryType, minImportance = 0.1 } = req.body;
    if (!subjectId || !query) return res.status(400).json({ error: 'subjectId and query are required' });

    const memories = await ltmService.recall({ namespace, subjectId, query, topK, memoryType, minImportance });

    // 标记已召回的记忆为已访问
    for (const m of memories) {
      ltmService.markAccessed(m.id).catch(() => {});
    }

    res.json({ success: true, data: { memories, count: memories.length } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function consolidateMemory(req, res) {
  try {
    const { namespace = 'user', subjectId, maxEntries = 20, memoryType } = req.body;
    if (!subjectId) return res.status(400).json({ error: 'subjectId is required' });

    // 先应用衰减
    await ltmService.applyDecay({ namespace, subjectId });

    // 再合并
    const result = await ltmService.consolidate({ namespace, subjectId, maxEntries, memoryType });

    res.json({ success: true, data: result || { message: 'Nothing to consolidate' } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getMemoryStats(req, res) {
  try {
    const { namespace = 'user', subjectId } = req.query;
    if (!subjectId) return res.status(400).json({ error: 'subjectId is required' });

    const stats = await ltmService.getStats({ namespace, subjectId });
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function purgeExpiredMemories(req, res) {
  try {
    const count = await ltmService.purgeExpired();
    res.json({ success: true, data: { purged: count } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
