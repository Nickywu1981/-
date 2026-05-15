/**
 * i18n API Routes — 动态翻译 CRUD + SSE
 * Phase 1.4 | Hardened Phase 2.x
 *
 * Public:  GET  /api/i18n/:locale
 *          GET  /api/i18n/:locale/:namespace
 *          GET  /api/i18n/version/stream
 * Admin:   GET  /api/admin/i18n/:locale
 *          GET  /api/admin/i18n/:locale/search
 *          POST /api/admin/i18n/:locale
 *          POST /api/admin/i18n/:locale/batch
 *          DELETE /api/admin/i18n/:locale/:key
 *          POST /api/admin/i18n/:locale/import
 *          GET  /api/admin/i18n/:locale/export
 *          GET  /api/admin/i18n/:locale/logs/:key
 */
import { Router } from 'express';
import { z } from 'zod';
import { adminAuth, optionalAuth } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import * as i18nService from '../services/i18n.service.js';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import logger from '../utils/logger.js';

const LOCALE_RE = /^[a-z]{2}(-[A-Z]{2})?$/;

function validateLocale(locale) {
  if (!LOCALE_RE.test(locale)) {
    const err = new Error('无效的语言代码');
    err.statusCode = 400;
    throw err;
  }
}

function handleError(res, err, context) {
  const logEntry = { error: err.message };
  if (process.env.NODE_ENV !== 'production') logEntry.stack = err.stack;
  logger.error(`[i18n] ${context}`, logEntry);
  if (err instanceof z.ZodError) {
    return error(res, ERROR_CODE.VALIDATION_ERROR, '参数校验失败', err.errors);
  }
  const status = (err.statusCode >= 100 && err.statusCode < 600) ? err.statusCode : 500;
  return error(res, status >= 100 && status < 600 ? status : 500, '服务异常，请稍后重试');
}

// ── Zod schemas ──

const singleEntrySchema = z.object({
  key: z.string().min(1).max(200),
  value: z.string().min(1).max(5000),
});

const batchSchema = z.object({
  entries: z.array(singleEntrySchema).min(1).max(1000),
});

const importBodySchema = z.record(z.string().min(1).max(200), z.string().max(5000)).refine(
  (obj) => Object.keys(obj).length <= 5000,
  { message: '单次导入最多 5000 条翻译' }
);

// ===================== 公开路由 =====================

const publicRouter = Router();
publicRouter.use(apiLimiter);

publicRouter.get('/:locale', async (req, res) => {
  try {
    validateLocale(req.params.locale);
    const data = await i18nService.getTranslations(req.params.locale);
    success(res, data);
  } catch (err) {
    handleError(res, err, 'getTranslations');
  }
});

publicRouter.get('/:locale/:namespace', async (req, res) => {
  try {
    validateLocale(req.params.locale);
    const data = await i18nService.getTranslationsByNamespace(req.params.locale, req.params.namespace);
    success(res, data);
  } catch (err) {
    handleError(res, err, 'getTranslationsByNamespace');
  }
});

publicRouter.get('/version/stream', optionalAuth, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // 禁用 nginx 缓冲
  });
  res.write(`data: ${JSON.stringify({ version: i18nService.getI18nVersion() })}\n\n`);

  // 心跳保活，防止 Express 30s 超时断开
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 25000);
  heartbeat.unref();

  const onVersion = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  import('../services/config-version.service.js').then(mod => {
    if (mod.versionEmitter) mod.versionEmitter.on('i18n-version', onVersion);
  }).catch(err => { logger.error('[i18n] SSE versionEmitter on', { error: err.message }); });

  const cleanup = () => {
    clearInterval(heartbeat);
    import('../services/config-version.service.js').then(mod => {
      if (mod.versionEmitter) mod.versionEmitter.off('i18n-version', onVersion);
    }).catch(err => { logger.error('[i18n] SSE versionEmitter off', { error: err.message }); });
  };
  req.on('close', cleanup);
  res.on('error', cleanup);
});

// ===================== 管理路由（需 adminAuth） =====================

const adminRouter = Router();
adminRouter.use(adminAuth);

adminRouter.get('/:locale', async (req, res) => {
  try {
    validateLocale(req.params.locale);
    const all = await i18nService.getTranslations(req.params.locale);
    const namespaces = await i18nService.getNamespaces(req.params.locale);
    const entries = Object.entries(all).map(([key, value]) => {
      const dot = key.indexOf('.');
      return { key, namespace: dot > 0 ? key.substring(0, dot) : 'common', value };
    });
    success(res, { entries, namespaces });
  } catch (err) {
    handleError(res, err, 'admin getTranslations');
  }
});

adminRouter.get('/:locale/search', async (req, res) => {
  try {
    validateLocale(req.params.locale);
    const rows = await i18nService.searchTranslations(req.params.locale, req.query.q || '');
    success(res, rows);
  } catch (err) {
    handleError(res, err, 'searchTranslations');
  }
});

adminRouter.post('/:locale', async (req, res) => {
  try {
    validateLocale(req.params.locale);
    const { key, value } = singleEntrySchema.parse(req.body);
    const result = await i18nService.setTranslation(req.params.locale, key, value, req.user?.id);
    success(res, result);
  } catch (err) {
    handleError(res, err, 'setTranslation');
  }
});

adminRouter.post('/:locale/batch', async (req, res) => {
  try {
    validateLocale(req.params.locale);
    const { entries } = batchSchema.parse(req.body);
    const obj = {};
    for (const e of entries) obj[e.key] = e.value;
    const result = await i18nService.importTranslations(req.params.locale, obj);
    success(res, result);
  } catch (err) {
    handleError(res, err, 'batchTranslation');
  }
});

adminRouter.delete('/:locale/:key', async (req, res) => {
  try {
    validateLocale(req.params.locale);
    await i18nService.deleteTranslation(req.params.locale, req.params.key);
    success(res, {}, '删除成功');
  } catch (err) {
    handleError(res, err, 'deleteTranslation');
  }
});

adminRouter.post('/:locale/import', async (req, res) => {
  try {
    validateLocale(req.params.locale);
    const data = importBodySchema.parse(req.body);
    const result = await i18nService.importTranslations(req.params.locale, data, req.query.skipEdted === '1');
    success(res, result);
  } catch (err) {
    handleError(res, err, 'importTranslations');
  }
});

adminRouter.get('/:locale/export', async (req, res) => {
  try {
    validateLocale(req.params.locale);
    const data = await i18nService.getTranslations(req.params.locale);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.locale}.json"`);
    success(res, data);
  } catch (err) {
    handleError(res, err, 'exportTranslations');
  }
});

adminRouter.get('/:locale/logs/:key', async (req, res) => {
  try {
    validateLocale(req.params.locale);
    const logs = await i18nService.getLogs(req.params.locale, req.params.key);
    success(res, logs);
  } catch (err) {
    handleError(res, err, 'getLogs');
  }
});

export { publicRouter, adminRouter };
