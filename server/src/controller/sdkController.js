/**
 * MemFocus SDK Controller — 对外暴露 8 大能力 API
 */
import { wrapController } from '../utils/wrapController.js';
import { memfocus } from '../sdk/memfocus-sdk.js';
import { retrieveContext } from '../services/ragService.js';

export const sdkController = {

  // ── CSRF / 能力清单 / 健康 ──
  csrf: wrapController((req) => ({ csrfToken: req.csrfToken || null })),

  capabilities: wrapController(() => memfocus.capabilities()),

  health: wrapController(() => memfocus.health.check()),

  ping: wrapController(() => memfocus.health.ping()),

  // ── 记忆力 ──
  memorySearch: wrapController(async (req) => memfocus.memory.search(req.body.query)),

  memoryEmbed: wrapController(async (req) => memfocus.memory.embed(req.body)),

  memoryList: wrapController(async (req) => memfocus.memory.list(req.params.userId, req.query)),

  memoryStatus: wrapController(() => memfocus.memory.getStatus()),

  memoryRag: wrapController(async (req) => {
    const { query, topK = 5 } = req.body;
    return await retrieveContext(query, { topK, format: 'compact' });
  }),

  // ── 判断力 ──
  attentionClassify: wrapController(async (req) => memfocus.attention.classify(req.body)),

  attentionRank: wrapController(async (req) => memfocus.attention.rank(req.body.queries || [])),

  // ── 理解力 ──
  contextDisambiguate: wrapController(async (req) => memfocus.context.disambiguate(req.body)),

  contextSummarize: wrapController(async (req) => ({
    summary: await memfocus.context.summarize(req.body.history || []),
  })),

  // ── 多语言 ──
  localizeLanguages: wrapController(() => memfocus.localize.getLanguages()),

  localizePlatforms: wrapController(() => memfocus.localize.getPlatformSpecs()),

  localizePlatformDetail: wrapController((req) => memfocus.localize.getPlatformSpecs(req.params.platform)),

  localizeScript: wrapController(async (req) => memfocus.localize.generateScript(req.body)),

  localizeTranslate: wrapController(async (req) => memfocus.localize.translate({
    userId: (req.user?.userId || req.user?.id),
    ...req.body,
  })),

  // ── 写作力 ──
  contentTitles: wrapController(async (req) => memfocus.content.generateTitles(
    (req.user?.userId || req.user?.id), req.body,
  )),

  contentSellingPoints: wrapController(async (req) => memfocus.content.generateSellingPoints(
    (req.user?.userId || req.user?.id), req.body,
  )),

  contentDescription: wrapController(async (req) => memfocus.content.generateDescription(
    (req.user?.userId || req.user?.id), req.body,
  )),

  contentSeeding: wrapController(async (req) => memfocus.content.generateSeeding(
    (req.user?.userId || req.user?.id), req.body,
  )),

  contentScript: wrapController(async (req) => memfocus.content.generateScript(
    (req.user?.userId || req.user?.id), req.body,
  )),

  contentPlatformRules: wrapController(() => memfocus.content.getPlatformRules()),

  // ── 风控力 ──
  guardCheckText: wrapController(async (req) => memfocus.guard.checkText(req.body.text, req.body.options || {})),

  guardCheckImage: wrapController(async (req) => memfocus.guard.checkImage(req.body.imageUrl, req.body.options || {})),

  guardAudit: wrapController(async (req) => memfocus.guard.fullAudit(req.body)),

  // ── 视觉力 ──
  visualVideo: wrapController(async (req) => memfocus.visual.submitVideo(
    (req.user?.userId || req.user?.id), req.body,
  )),

  visualBatch: wrapController(async (req) => memfocus.visual.submitBatch(
    (req.user?.userId || req.user?.id), req.body,
  )),

  visualTaskStatus: wrapController(async (req) => memfocus.visual.getTaskStatus(
    req.params.taskId, (req.user?.userId || req.user?.id),
  )),

  visualListTasks: wrapController(async (req) => memfocus.visual.listTasks(
    (req.user?.userId || req.user?.id), req.query,
  )),

  visualCancelTask: wrapController(async (req) => memfocus.visual.cancelTask(
    req.params.taskId, (req.user?.userId || req.user?.id),
  )),

  visualImage: wrapController(async (req) => memfocus.visual.processImage(
    (req.user?.userId || req.user?.id), req.body,
  )),
};
