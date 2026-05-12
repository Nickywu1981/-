import { z } from 'zod';
import { authMiddleware as requireAuth } from '../middleware/auth.js';
import { apiLimiter, heavyLimiter } from '../middleware/rateLimiter.js';
import * as ctrl from '../controller/longTermMemoryController.js';

export default function (router) {
  // 存储记忆
  router.post('/store', requireAuth, heavyLimiter, z.object({
    namespace: z.string().max(64).optional().default('user'),
    subjectId: z.string().min(1).max(64),
    memoryKey: z.string().max(255).optional(),
    content: z.string().min(1).max(10000),
    memoryType: z.enum(['fact','preference','decision','pattern','rule','conversation']).optional().default('fact'),
    importance: z.number().min(0).max(1).optional().default(0.5),
    source: z.string().max(128).optional(),
    tags: z.array(z.string().max(64)).max(20).optional(),
    metadata: z.record(z.any()).optional(),
    isPinned: z.boolean().optional().default(false),
    expiresAt: z.string().datetime().optional(),
  }), ctrl.storeMemory);

  // 批量存储
  router.post('/batch', requireAuth, heavyLimiter, z.object({
    entries: z.array(z.object({
      namespace: z.string().max(64).optional().default('user'),
      subjectId: z.string().min(1).max(64),
      memoryKey: z.string().max(255).optional(),
      content: z.string().min(1).max(10000),
      memoryType: z.enum(['fact','preference','decision','pattern','rule','conversation']).optional().default('fact'),
      importance: z.number().min(0).max(1).optional().default(0.5),
      source: z.string().max(128).optional(),
      tags: z.array(z.string().max(64)).max(20).optional(),
      metadata: z.record(z.any()).optional(),
      isPinned: z.boolean().optional().default(false),
      expiresAt: z.string().datetime().optional(),
    })).min(1).max(100),
  }), ctrl.batchStoreMemory);

  // RAG 检索记忆
  router.post('/recall', requireAuth, heavyLimiter, z.object({
    namespace: z.string().max(64).optional().default('user'),
    subjectId: z.string().min(1).max(64),
    query: z.string().min(1).max(2000),
    topK: z.number().int().min(1).max(20).optional().default(5),
    memoryType: z.enum(['fact','preference','decision','pattern','rule','conversation']).optional(),
    minImportance: z.number().min(0).max(1).optional().default(0.1),
  }), ctrl.recallMemory);

  // 记忆合并
  router.post('/consolidate', requireAuth, heavyLimiter, z.object({
    namespace: z.string().max(64).optional().default('user'),
    subjectId: z.string().min(1).max(64),
    maxEntries: z.number().int().min(3).max(100).optional().default(20),
    memoryType: z.enum(['fact','preference','decision','pattern','rule','conversation']).optional(),
  }), ctrl.consolidateMemory);

  // 统计信息
  router.get('/stats', requireAuth, apiLimiter, ctrl.getMemoryStats);

  // 清理过期
  router.post('/purge', requireAuth, heavyLimiter, ctrl.purgeExpiredMemories);
}
