/**
 * MemFocus SDK REST 路由 — 对外暴露 8 大能力 API
 *
 * 内部调用：  import { memfocus } from '../sdk/memfocus-sdk.js'
 * 外部调用：  POST /api/sdk/memory/search
 */

import { Router } from 'express';
import { memfocus } from '../sdk/memfocus-sdk.js';
import { success, error } from '../utils/response.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// ═══════════════════ CSRF 令牌获取 ═══════════════════
router.get('/csrf', (_req, res) => {
  success(res, { csrfToken: _req.csrfToken ? _req.csrfToken() : null });
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
router.post('/memory/search', authMiddleware, async (req, res) => {
  try {
    const result = await memfocus.memory.search(req.body.query);
    success(res, result);
  } catch (err) { error(res, err); }
});

router.post('/memory/embed', authMiddleware, async (req, res) => {
  try {
    const result = await memfocus.memory.embed(req.body);
    success(res, result);
  } catch (err) { error(res, err); }
});

router.get('/memory/list/:userId', authMiddleware, async (req, res) => {
  try {
    const result = await memfocus.memory.list(req.params.userId, req.query);
    success(res, result);
  } catch (err) { error(res, err); }
});

// ═══════════════════ 判断力 ═══════════════════
router.post('/attention/classify', authMiddleware, async (req, res) => {
  try {
    const result = await memfocus.attention.classify(req.body);
    success(res, result);
  } catch (err) { error(res, err); }
});

router.post('/attention/rank', authMiddleware, async (req, res) => {
  try {
    const result = await memfocus.attention.rank(req.body.queries || []);
    success(res, result);
  } catch (err) { error(res, err); }
});

// ═══════════════════ 理解力 ═══════════════════
router.post('/context/disambiguate', authMiddleware, async (req, res) => {
  try {
    const result = await memfocus.context.disambiguate(req.body);
    success(res, result);
  } catch (err) { error(res, err); }
});

router.post('/context/summarize', authMiddleware, async (req, res) => {
  try {
    const result = await memfocus.context.summarize(req.body.history || []);
    success(res, { summary: result });
  } catch (err) { error(res, err); }
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

router.post('/localize/script', authMiddleware, async (req, res) => {
  try {
    const result = await memfocus.localize.generateScript(req.body);
    success(res, result);
  } catch (err) { error(res, err); }
});

router.post('/localize/translate', authMiddleware, async (req, res) => {
  try {
    const result = await memfocus.localize.translate({ userId: (req.user?.userId || req.user?.id), ...req.body });
    success(res, result);
  } catch (err) { error(res, err); }
});

// ═══════════════════ 写作力 ═══════════════════
router.post('/content/titles', authMiddleware, async (req, res) => {
  try {
    const result = await memfocus.content.generateTitles((req.user?.userId || req.user?.id), req.body);
    success(res, result);
  } catch (err) { error(res, err); }
});

router.post('/content/selling-points', authMiddleware, async (req, res) => {
  try {
    const result = await memfocus.content.generateSellingPoints((req.user?.userId || req.user?.id), req.body);
    success(res, result);
  } catch (err) { error(res, err); }
});

router.post('/content/description', authMiddleware, async (req, res) => {
  try {
    const result = await memfocus.content.generateDescription((req.user?.userId || req.user?.id), req.body);
    success(res, result);
  } catch (err) { error(res, err); }
});

router.post('/content/seeding', authMiddleware, async (req, res) => {
  try {
    const result = await memfocus.content.generateSeeding((req.user?.userId || req.user?.id), req.body);
    success(res, result);
  } catch (err) { error(res, err); }
});

router.post('/content/script', authMiddleware, async (req, res) => {
  try {
    const result = await memfocus.content.generateScript((req.user?.userId || req.user?.id), req.body);
    success(res, result);
  } catch (err) { error(res, err); }
});

router.get('/content/platform-rules', (_req, res) => {
  success(res, memfocus.content.getPlatformRules());
});

// ═══════════════════ 风控力 ═══════════════════
router.post('/guard/check-text', authMiddleware, async (req, res) => {
  try {
    const result = await memfocus.guard.checkText(req.body.text, req.body.options || {});
    success(res, result);
  } catch (err) { error(res, err); }
});

router.post('/guard/check-image', authMiddleware, async (req, res) => {
  try {
    const result = await memfocus.guard.checkImage(req.body.imageUrl, req.body.options || {});
    success(res, result);
  } catch (err) { error(res, err); }
});

router.post('/guard/audit', authMiddleware, async (req, res) => {
  try {
    const result = await memfocus.guard.fullAudit(req.body);
    success(res, result);
  } catch (err) { error(res, err); }
});

// ═══════════════════ 视觉力 ═══════════════════
router.post('/visual/video', authMiddleware, async (req, res) => {
  try {
    const result = await memfocus.visual.submitVideo((req.user?.userId || req.user?.id), req.body);
    success(res, result);
  } catch (err) { error(res, err); }
});

router.post('/visual/batch', authMiddleware, async (req, res) => {
  try {
    const result = await memfocus.visual.submitBatch((req.user?.userId || req.user?.id), req.body);
    success(res, result);
  } catch (err) { error(res, err); }
});

router.get('/visual/task/:taskId', authMiddleware, async (req, res) => {
  try {
    const result = await memfocus.visual.getTaskStatus(req.params.taskId, (req.user?.userId || req.user?.id));
    success(res, result);
  } catch (err) { error(res, err); }
});

router.get('/visual/tasks', authMiddleware, async (req, res) => {
  try {
    const result = await memfocus.visual.listTasks((req.user?.userId || req.user?.id), req.query);
    success(res, result);
  } catch (err) { error(res, err); }
});

router.post('/visual/task/:taskId/cancel', authMiddleware, async (req, res) => {
  try {
    const result = await memfocus.visual.cancelTask(req.params.taskId, (req.user?.userId || req.user?.id));
    success(res, result);
  } catch (err) { error(res, err); }
});

router.post('/visual/image', authMiddleware, async (req, res) => {
  try {
    const result = await memfocus.visual.processImage((req.user?.userId || req.user?.id), req.body);
    success(res, result);
  } catch (err) { error(res, err); }
});

export default router;
