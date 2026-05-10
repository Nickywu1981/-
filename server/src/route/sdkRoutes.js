/**
 * MemFocus SDK REST 路由 — 对外暴露 8 大能力 API
 *
 * 内部调用：  import { memfocus } from '../sdk/memfocus-sdk.js'
 * 外部调用：  POST /api/sdk/memory/search
 */

import { Router } from 'express';
import { z } from 'zod';
import { memfocus } from '../sdk/memfocus-sdk.js';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import logger from '../utils/logger.js';
import { validate } from '../utils/validate.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

const numericParam = (name) => z.object({ [name]: z.string().regex(/^\d+$/).transform(Number) });
const userIdParamSchema = numericParam('userId');
const taskIdParamSchema = numericParam('taskId');

// ── Zod schemas ────────────────────────────────────────────────────────
const memorySearchSchema = z.object({ query: z.string().min(1) });
const memoryEmbedSchema = z.object({
  content: z.string().min(1),
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
const paramsWithTaskId = z.object({ taskId: z.string().min(1) });
const contextSummarizeSchema = z.object({ history: z.array(z.object({ role: z.string(), content: z.string() })).optional() });
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
  text: z.string().min(1),
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

// ═══════════════════ CSRF 令牌获取 ═══════════════════
router.get('/csrf', (req, res) => {
  success(res, { csrfToken: req.csrfToken || null });
});

// ═══════════════════ 能力清单 ═══════════════════
router.get('/capabilities', (_req, res) => {
  success(res, memfocus.capabilities());
});

// ═══════════════════ 健康检查 ═══════════════════
router.get('/health', async (_req, res) => {
  const result = await memfocus.health.check();
  success(res, result);
});

router.get('/ping', (_req, res) => {
  success(res, memfocus.health.ping());
});

// ═══════════════════ 记忆力 ═══════════════════
router.post('/memory/search', authMiddleware, validate(memorySearchSchema), async (req, res) => {
  try {
    const result = await memfocus.memory.search(req.body.query);
    success(res, result);
  } catch (err) {
    logger.error('[sdk]', err);
    error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.status ? err.message : '系统异常');
  }
});

router.post('/memory/embed', authMiddleware, validate(memoryEmbedSchema), async (req, res) => {
  try {
    const result = await memfocus.memory.embed(req.body);
    success(res, result);
  } catch (err) {
    logger.error('[sdk]', err);
    error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.status ? err.message : '系统异常');
  }
});

router.get('/memory/list/:userId', authMiddleware, validate(userIdParamSchema, 'params'), async (req, res) => {
  try {
    const result = await memfocus.memory.list(req.params.userId, req.query);
    success(res, result);
  } catch (err) {
    logger.error('[sdk]', err);
    error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.status ? err.message : '系统异常');
  }
});

// ═══════════════════ 判断力 ═══════════════════
router.post('/attention/classify', authMiddleware, validate(attentionClassifySchema), async (req, res) => {
  try {
    const result = await memfocus.attention.classify(req.body);
    success(res, result);
  } catch (err) {
    logger.error('[sdk]', err);
    error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.status ? err.message : '系统异常');
  }
});

router.post('/attention/rank', authMiddleware, validate(attentionRankSchema), async (req, res) => {
  try {
    const result = await memfocus.attention.rank(req.body.queries || []);
    success(res, result);
  } catch (err) {
    logger.error('[sdk]', err);
    error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.status ? err.message : '系统异常');
  }
});

// ═══════════════════ 理解力 ═══════════════════
router.post('/context/disambiguate', authMiddleware, validate(contextDisambiguateSchema), async (req, res) => {
  try {
    const result = await memfocus.context.disambiguate(req.body);
    success(res, result);
  } catch (err) {
    logger.error('[sdk]', err);
    error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.status ? err.message : '系统异常');
  }
});

router.post('/context/summarize', authMiddleware, validate(contextSummarizeSchema), async (req, res) => {
  try {
    const result = await memfocus.context.summarize(req.body.history || []);
    success(res, { summary: result });
  } catch (err) {
    logger.error('[sdk]', err);
    error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.status ? err.message : '系统异常');
  }
});

// ═══════════════════ 多语言 ═══════════════════
router.get('/localize/languages', (_req, res) => {
  success(res, memfocus.localize.getLanguages());
});

router.get('/localize/platforms', (_req, res) => {
  success(res, memfocus.localize.getPlatformSpecs());
});

router.get('/localize/platforms/:platform', (req, res) => {
  success(res, memfocus.localize.getPlatformSpecs(req.params.platform));
});

router.post('/localize/script', authMiddleware, validate(localizeScriptSchema), async (req, res) => {
  try {
    const result = await memfocus.localize.generateScript(req.body);
    success(res, result);
  } catch (err) {
    logger.error('[sdk]', err);
    error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.status ? err.message : '系统异常');
  }
});

router.post('/localize/translate', authMiddleware, validate(localizeTranslateSchema), async (req, res) => {
  try {
    const result = await memfocus.localize.translate({ userId: (req.user?.userId || req.user?.id), ...req.body });
    success(res, result);
  } catch (err) {
    logger.error('[sdk]', err);
    error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.status ? err.message : '系统异常');
  }
});

// ═══════════════════ 写作力 ═══════════════════
router.post('/content/titles', authMiddleware, validate(contentGenerateSchema), async (req, res) => {
  try {
    const result = await memfocus.content.generateTitles((req.user?.userId || req.user?.id), req.body);
    success(res, result);
  } catch (err) {
    logger.error('[sdk]', err);
    error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.status ? err.message : '系统异常');
  }
});

router.post('/content/selling-points', authMiddleware, validate(contentGenerateSchema), async (req, res) => {
  try {
    const result = await memfocus.content.generateSellingPoints((req.user?.userId || req.user?.id), req.body);
    success(res, result);
  } catch (err) {
    logger.error('[sdk]', err);
    error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.status ? err.message : '系统异常');
  }
});

router.post('/content/description', authMiddleware, validate(contentGenerateSchema), async (req, res) => {
  try {
    const result = await memfocus.content.generateDescription((req.user?.userId || req.user?.id), req.body);
    success(res, result);
  } catch (err) {
    logger.error('[sdk]', err);
    error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.status ? err.message : '系统异常');
  }
});

router.post('/content/seeding', authMiddleware, validate(contentGenerateSchema), async (req, res) => {
  try {
    const result = await memfocus.content.generateSeeding((req.user?.userId || req.user?.id), req.body);
    success(res, result);
  } catch (err) {
    logger.error('[sdk]', err);
    error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.status ? err.message : '系统异常');
  }
});

router.post('/content/script', authMiddleware, validate(contentGenerateSchema), async (req, res) => {
  try {
    const result = await memfocus.content.generateScript((req.user?.userId || req.user?.id), req.body);
    success(res, result);
  } catch (err) {
    logger.error('[sdk]', err);
    error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.status ? err.message : '系统异常');
  }
});

router.get('/content/platform-rules', (_req, res) => {
  success(res, memfocus.content.getPlatformRules());
});

// ═══════════════════ 风控力 ═══════════════════
router.post('/guard/check-text', authMiddleware, validate(guardCheckTextSchema), async (req, res) => {
  try {
    const result = await memfocus.guard.checkText(req.body.text, req.body.options || {});
    success(res, result);
  } catch (err) {
    logger.error('[sdk]', err);
    error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.status ? err.message : '系统异常');
  }
});

router.post('/guard/check-image', authMiddleware, validate(guardCheckImageSchema), async (req, res) => {
  try {
    const result = await memfocus.guard.checkImage(req.body.imageUrl, req.body.options || {});
    success(res, result);
  } catch (err) {
    logger.error('[sdk]', err);
    error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.status ? err.message : '系统异常');
  }
});

router.post('/guard/audit', authMiddleware, validate(guardAuditSchema), async (req, res) => {
  try {
    const result = await memfocus.guard.fullAudit(req.body);
    success(res, result);
  } catch (err) {
    logger.error('[sdk]', err);
    error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.status ? err.message : '系统异常');
  }
});

// ═══════════════════ 视觉力 ═══════════════════
router.post('/visual/video', authMiddleware, validate(visualSubmitSchema), async (req, res) => {
  try {
    const result = await memfocus.visual.submitVideo((req.user?.userId || req.user?.id), req.body);
    success(res, result);
  } catch (err) {
    logger.error('[sdk]', err);
    error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.status ? err.message : '系统异常');
  }
});

router.post('/visual/batch', authMiddleware, validate(visualBatchSchema), async (req, res) => {
  try {
    const result = await memfocus.visual.submitBatch((req.user?.userId || req.user?.id), req.body);
    success(res, result);
  } catch (err) {
    logger.error('[sdk]', err);
    error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.status ? err.message : '系统异常');
  }
});

router.get('/visual/task/:taskId', authMiddleware, validate(taskIdParamSchema, 'params'), async (req, res) => {
  try {
    const result = await memfocus.visual.getTaskStatus(req.params.taskId, (req.user?.userId || req.user?.id));
    success(res, result);
  } catch (err) {
    logger.error('[sdk]', err);
    error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.status ? err.message : '系统异常');
  }
});

router.get('/visual/tasks', authMiddleware, async (req, res) => {
  try {
    const result = await memfocus.visual.listTasks((req.user?.userId || req.user?.id), req.query);
    success(res, result);
  } catch (err) {
    logger.error('[sdk]', err);
    error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.status ? err.message : '系统异常');
  }
});

router.post('/visual/task/:taskId/cancel', authMiddleware, validate(paramsWithTaskId, 'params'), async (req, res) => {
  try {
    const result = await memfocus.visual.cancelTask(req.params.taskId, (req.user?.userId || req.user?.id));
    success(res, result);
  } catch (err) {
    logger.error('[sdk]', err);
    error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.status ? err.message : '系统异常');
  }
});

router.post('/visual/image', authMiddleware, validate(visualImageSchema), async (req, res) => {
  try {
    const result = await memfocus.visual.processImage((req.user?.userId || req.user?.id), req.body);
    success(res, result);
  } catch (err) {
    logger.error('[sdk]', err);
    error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.status ? err.message : '系统异常');
  }
});

export default router;
