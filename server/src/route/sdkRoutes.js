/**
 * MemFocus SDK REST 路由 — 对外暴露 8 大能力 API
 */
import { Router } from 'express';
import { z } from 'zod';
import { sdkController } from '../controller/sdkController.js';
import { validate, numericParamSchema } from '../utils/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';

const router = Router();
const userIdParamSchema = numericParamSchema('userId');
const taskIdParamSchema = numericParamSchema('taskId');

// ── Zod schemas ──
const memorySearchSchema = z.object({ query: z.string().min(1).max(500) });
const memoryEmbedSchema = z.object({
  content: z.string().min(1).max(5000),
  source: z.string().optional(),
  tags: z.array(z.string()).optional(),
});
const attentionClassifySchema = z.object({
  type: z.string().optional(),
  content: z.string(),
  userId: z.union([z.string(), z.number()]).optional(),
});
const attentionRankSchema = z.object({ queries: z.array(z.string()).min(1) });
const contextDisambiguateSchema = z.object({
  currentMessage: z.string(),
  history: z.array(z.object({ role: z.string(), content: z.string() })).optional(),
  productContext: z.record(z.unknown()).optional(),
});
const paramsWithTaskId = z.object({ taskId: z.string().min(1).max(50) });
const contextSummarizeSchema = z.object({
  history: z.array(z.object({ role: z.string(), content: z.string() })).optional(),
});
const localizeScriptSchema = z.object({
  product: z.record(z.unknown()).optional(),
  language: z.string().optional(),
  scriptType: z.string().optional(),
  platform: z.string().optional(),
  tone: z.string().optional(),
});
const localizeTranslateSchema = z.object({
  text: z.string().optional(),
  productName: z.string().optional(),
  description: z.string().optional(),
  features: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
const contentGenerateSchema = z.object({
  productName: z.string().optional(),
  product_name: z.string().optional(),
  name: z.string().optional(),
  platform: z.string().optional(),
  style: z.string().optional(),
  tone: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  count: z.number().int().min(1).max(10).optional(),
  model: z.string().optional(),
});
const guardCheckTextSchema = z.object({
  text: z.string().min(1).max(5000),
  options: z.record(z.unknown()).optional(),
});
const guardCheckImageSchema = z.object({
  imageUrl: z.string().url(),
  options: z.record(z.unknown()).optional(),
});
const guardAuditSchema = z.object({
  content: z.string().optional(),
  platform: z.string().optional(),
  region: z.string().optional(),
  category: z.string().optional(),
});
const visualSubmitSchema = z.object({
  productName: z.string().optional(),
  platform: z.string().optional(),
  style: z.string().optional(),
  duration: z.number().optional(),
});
const visualBatchSchema = z.object({ tasks: z.array(z.record(z.unknown())).min(1) });
const visualImageSchema = z.object({
  productName: z.string().optional(),
  platform: z.string().optional(),
  style: z.string().optional(),
});

// ── CSRF / 能力清单 / 健康 ──
router.get('/csrf', sdkController.csrf);
router.get('/capabilities', sdkController.capabilities);
router.get('/health', sdkController.health);
router.get('/ping', sdkController.ping);

// ── 记忆力 ──
router.post('/memory/search', heavyLimiter, authMiddleware, validate(memorySearchSchema), sdkController.memorySearch);
router.post('/memory/embed', heavyLimiter, authMiddleware, validate(memoryEmbedSchema), sdkController.memoryEmbed);
router.get('/memory/list/:userId', authMiddleware, validate(userIdParamSchema, 'params'), sdkController.memoryList);
router.get('/memory/status', authMiddleware, sdkController.memoryStatus);
router.post('/memory/rag', heavyLimiter, authMiddleware, validate(memorySearchSchema), sdkController.memoryRag);

// ── 判断力 ──
router.post('/attention/classify', heavyLimiter, authMiddleware, validate(attentionClassifySchema), sdkController.attentionClassify);
router.post('/attention/rank', heavyLimiter, authMiddleware, validate(attentionRankSchema), sdkController.attentionRank);

// ── 理解力 ──
router.post('/context/disambiguate', heavyLimiter, authMiddleware, validate(contextDisambiguateSchema), sdkController.contextDisambiguate);
router.post('/context/summarize', heavyLimiter, authMiddleware, validate(contextSummarizeSchema), sdkController.contextSummarize);

// ── 多语言 ──
router.get('/localize/languages', sdkController.localizeLanguages);
router.get('/localize/platforms', sdkController.localizePlatforms);
router.get('/localize/platforms/:platform', sdkController.localizePlatformDetail);
router.post('/localize/script', heavyLimiter, authMiddleware, validate(localizeScriptSchema), sdkController.localizeScript);
router.post('/localize/translate', heavyLimiter, authMiddleware, validate(localizeTranslateSchema), sdkController.localizeTranslate);

// ── 写作力 ──
router.post('/content/titles', heavyLimiter, authMiddleware, validate(contentGenerateSchema), sdkController.contentTitles);
router.post('/content/selling-points', heavyLimiter, authMiddleware, validate(contentGenerateSchema), sdkController.contentSellingPoints);
router.post('/content/description', heavyLimiter, authMiddleware, validate(contentGenerateSchema), sdkController.contentDescription);
router.post('/content/seeding', heavyLimiter, authMiddleware, validate(contentGenerateSchema), sdkController.contentSeeding);
router.post('/content/script', heavyLimiter, authMiddleware, validate(contentGenerateSchema), sdkController.contentScript);
router.get('/content/platform-rules', sdkController.contentPlatformRules);

// ── 风控力 ──
router.post('/guard/check-text', heavyLimiter, authMiddleware, validate(guardCheckTextSchema), sdkController.guardCheckText);
router.post('/guard/check-image', heavyLimiter, authMiddleware, validate(guardCheckImageSchema), sdkController.guardCheckImage);
router.post('/guard/audit', heavyLimiter, authMiddleware, validate(guardAuditSchema), sdkController.guardAudit);

// ── 视觉力 ──
router.post('/visual/video', heavyLimiter, authMiddleware, validate(visualSubmitSchema), sdkController.visualVideo);
router.post('/visual/batch', heavyLimiter, authMiddleware, validate(visualBatchSchema), sdkController.visualBatch);
router.get('/visual/task/:taskId', authMiddleware, validate(taskIdParamSchema, 'params'), sdkController.visualTaskStatus);
router.get('/visual/tasks', authMiddleware, sdkController.visualListTasks);
router.post('/visual/task/:taskId/cancel', authMiddleware, validate(paramsWithTaskId, 'params'), sdkController.visualCancelTask);
router.post('/visual/image', heavyLimiter, authMiddleware, validate(visualImageSchema), sdkController.visualImage);

export default router;
