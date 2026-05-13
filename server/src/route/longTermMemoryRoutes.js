import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { apiLimiter, heavyLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../utils/validate.js';
import * as ctrl from '../controller/longTermMemoryController.js';

const router = Router();

// 所有 LTM 路由都需要认证
router.use(authMiddleware);

const storeSchema = z.object({
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
});

const batchSchema = z.object({
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
});

const recallSchema = z.object({
  namespace: z.string().max(64).optional().default('user'),
  subjectId: z.string().min(1).max(64),
  query: z.string().min(1).max(2000),
  topK: z.number().int().min(1).max(20).optional().default(5),
  memoryType: z.enum(['fact','preference','decision','pattern','rule','conversation']).optional(),
  minImportance: z.number().min(0).max(1).optional().default(0.1),
});

const consolidateSchema = z.object({
  namespace: z.string().max(64).optional().default('user'),
  subjectId: z.string().min(1).max(64),
  maxEntries: z.number().int().min(3).max(100).optional().default(20),
  memoryType: z.enum(['fact','preference','decision','pattern','rule','conversation']).optional(),
});

// 存储记忆
router.post('/store', validate(storeSchema), ctrl.storeMemory);

// 批量存储
router.post('/batch', validate(batchSchema), ctrl.batchStoreMemory);

// RAG 检索记忆
router.post('/recall', validate(recallSchema), ctrl.recallMemory);

// 记忆合并
router.post('/consolidate', validate(consolidateSchema), ctrl.consolidateMemory);

// 统计信息
router.get('/stats', apiLimiter, ctrl.getMemoryStats);

// 清理过期
router.post('/purge', heavyLimiter, ctrl.purgeExpiredMemories);

// ==================== LangMemE 自进化 ====================

// POST /api/memory/evolve — 触发自进化（提取模式→生成规则）
router.post('/evolve', heavyLimiter, ctrl.evolveMemory);

// GET /api/memory/evolution-stats — 进化指标
router.get('/evolution-stats', apiLimiter, ctrl.getEvolutionStats);

// POST /api/memory/extract-patterns — 单用户模式提取
router.post('/extract-patterns', apiLimiter, ctrl.extractMemPatterns);

export default router;
