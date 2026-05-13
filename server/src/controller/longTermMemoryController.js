import { wrapController } from '../utils/wrapController.js';
import { success } from '../utils/response.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import * as ltmService from '../services/longTermMemoryService.js';
import * as langMemE from '../services/langMemEvolutionService.js';
import logger from '../utils/logger.js';

// 强制 subjectId 绑定当前登录用户，防止越权访问他人记忆
function scopedSubjectId(req, explicitId) {
  const userId = String(req.user?.id || req.user?.userId);
  if (explicitId && explicitId !== userId) {
    throw new BusinessError(ERROR_CODE.FORBIDDEN, '无权操作他人的记忆数据');
  }
  return userId;
}

export const storeMemory = wrapController(async (req, res) => {
  const d = req.validated;
  const id = await ltmService.store({
    namespace: d.namespace, subjectId: scopedSubjectId(req, d.subjectId),
    memoryKey: d.memoryKey || `auto_${Date.now()}`,
    content: d.content, memoryType: d.memoryType, importance: d.importance,
    source: d.source, tags: d.tags, metadata: d.metadata,
    isPinned: d.isPinned, expiresAt: d.expiresAt,
  });
  return success(res, { id });
});

export const batchStoreMemory = wrapController(async (req, res) => {
  const entries = req.validated.entries.map(e => ({ ...e, subjectId: scopedSubjectId(req, e.subjectId) }));
  const results = await ltmService.storeBatch(entries);
  return success(res, { stored: results.length, items: results });
});

export const recallMemory = wrapController(async (req, res) => {
  const d = req.validated;
  const memories = await ltmService.recall({ ...d, subjectId: scopedSubjectId(req, d.subjectId) });

  for (const m of memories) {
    ltmService.markAccessed(m.id).catch(err => logger.warn('[LTM] markAccessed failed:', err.message));
  }

  return success(res, { memories, count: memories.length });
});

export const consolidateMemory = wrapController(async (req, res) => {
  const d = req.validated;
  await ltmService.applyDecay({ namespace: d.namespace, subjectId: scopedSubjectId(req, d.subjectId) });
  const result = await ltmService.consolidate(d);
  return success(res, result || { message: 'Nothing to consolidate' });
});

export const getMemoryStats = wrapController(async (req, res) => {
  const { namespace = 'user', subjectId } = req.query;
  if (!subjectId) throw new BusinessError(ERROR_CODE.VALIDATION_ERROR, 'subjectId is required');
  const stats = await ltmService.getStats({ namespace, subjectId: scopedSubjectId(req, subjectId) });
  return success(res, stats);
});

export const purgeExpiredMemories = wrapController(async (req, res) => {
  const count = await ltmService.purgeExpired();
  return success(res, { purged: count });
});

// ==================== LangMemE 自进化 ====================

export const evolveMemory = wrapController(async (req, res) => {
  const { namespace = 'user', subjectIds } = req.body || {};
  if (subjectIds && Array.isArray(subjectIds)) {
    return success(res, await langMemE.evolutionTick(subjectIds, namespace));
  }
  return success(res, await langMemE.fullEvolutionCycle(namespace));
});

export const getEvolutionStats = wrapController(async (req, res) => {
  const { namespace = 'user' } = req.query;
  const subjects = await langMemE.getActiveSubjects(namespace);
  return success(res, {
    ...langMemE.getEvolutionMetrics(),
    activeSubjects: subjects.length,
  });
});

export const extractMemPatterns = wrapController(async (req, res) => {
  const { namespace = 'user', subjectId, minSupport = 2 } = req.body || {};
  if (!subjectId) throw new BusinessError(ERROR_CODE.VALIDATION_ERROR, 'subjectId required');
  const patterns = await langMemE.extractPatterns({ namespace, subjectId: scopedSubjectId(req, subjectId), minSupport });
  return success(res, { patterns, count: patterns.length });
});
