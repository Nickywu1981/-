import { wrapController } from '../utils/wrapController.js';
import { success } from '../utils/response.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import * as ltmService from '../services/longTermMemoryService.js';
import logger from '../utils/logger.js';

export const storeMemory = wrapController(async (req, res) => {
  const d = req.validated;
  const id = await ltmService.store({
    namespace: d.namespace, subjectId: d.subjectId,
    memoryKey: d.memoryKey || `auto_${Date.now()}`,
    content: d.content, memoryType: d.memoryType, importance: d.importance,
    source: d.source, tags: d.tags, metadata: d.metadata,
    isPinned: d.isPinned, expiresAt: d.expiresAt,
  });
  return success(res, { id });
});

export const batchStoreMemory = wrapController(async (req, res) => {
  const results = await ltmService.storeBatch(req.validated.entries);
  return success(res, { stored: results.length, items: results });
});

export const recallMemory = wrapController(async (req, res) => {
  const d = req.validated;
  const memories = await ltmService.recall(d);

  for (const m of memories) {
    ltmService.markAccessed(m.id).catch(err => logger.warn('[LTM] markAccessed failed:', err.message));
  }

  return success(res, { memories, count: memories.length });
});

export const consolidateMemory = wrapController(async (req, res) => {
  const d = req.validated;
  await ltmService.applyDecay({ namespace: d.namespace, subjectId: d.subjectId });
  const result = await ltmService.consolidate(d);
  return success(res, result || { message: 'Nothing to consolidate' });
});

export const getMemoryStats = wrapController(async (req, res) => {
  const { namespace = 'user', subjectId } = req.query;
  if (!subjectId) throw new BusinessError(ERROR_CODE.VALIDATION_ERROR, 'subjectId is required');
  const stats = await ltmService.getStats({ namespace, subjectId });
  return success(res, stats);
});

export const purgeExpiredMemories = wrapController(async (req, res) => {
  const count = await ltmService.purgeExpired();
  return success(res, { purged: count });
});
