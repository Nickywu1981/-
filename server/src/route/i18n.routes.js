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
import { adminAuth } from '../middleware/auth.js';
import * as i18nService from '../services/i18n.service.js';
import logger from '../utils/logger.js';

const LOCALE_RE = /^[a-z]{2}(-[A-Z]{2})?$/;

function validateLocale(locale) {
  if (!LOCALE_RE.test(locale)) {
    const err = new Error('无效的语言代码');
    err.statusCode = 400;
    throw err;
  }
}

// ── Zod schemas ──

const singleEntrySchema = z.object({
  key: z.string().min(1).max(200),
  value: z.string().min(1).max(5000),
});

const batchSchema = z.object({
  entries: z.array(singleEntrySchema).min(1).max(1000),
});

const importBodySchema = z.record(z.string().min(1).max(200), z.string().max(5000));

// ===================== 公开路由 =====================

const publicRouter = Router();

publicRouter.get('/:locale', async (req, res) => {
  try {
    validateLocale(req.params.locale);
    const data = await i18nService.getTranslations(req.params.locale);
    res.json({ code: 0, data });
  } catch (err) {
    logger.error('[i18n] getTranslations', { locale: req.params.locale, error: err.message });
    const code = err.statusCode || 500;
    res.status(code >= 400 ? code : 500).json({ code: code >= 400 ? code : 500, msg: err.statusCode ? err.message : '获取翻译失败' });
  }
});

publicRouter.get('/:locale/:namespace', async (req, res) => {
  try {
    validateLocale(req.params.locale);
    const data = await i18nService.getTranslationsByNamespace(req.params.locale, req.params.namespace);
    res.json({ code: 0, data });
  } catch (err) {
    res.status(500).json({ code: 500, msg: '获取翻译失败' });
  }
});

publicRouter.get('/version/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write(`data: ${JSON.stringify({ version: i18nService.getI18nVersion() })}\n\n`);

  const onVersion = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  import('../services/config-version.service.js').then(mod => {
    if (mod.versionEmitter) mod.versionEmitter.on('i18n-version', onVersion);
  }).catch(() => {});

  req.on('close', () => {
    import('../services/config-version.service.js').then(mod => {
      if (mod.versionEmitter) mod.versionEmitter.off('i18n-version', onVersion);
    }).catch(() => {});
  });
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
    res.json({ code: 0, data: { entries, namespaces } });
  } catch (err) {
    res.status(500).json({ code: 500, msg: '获取翻译失败' });
  }
});

adminRouter.get('/:locale/search', async (req, res) => {
  try {
    validateLocale(req.params.locale);
    const rows = await i18nService.searchTranslations(req.params.locale, req.query.q || '');
    res.json({ code: 0, data: rows });
  } catch (err) {
    res.status(500).json({ code: 500, msg: '搜索失败' });
  }
});

adminRouter.post('/:locale', async (req, res) => {
  try {
    validateLocale(req.params.locale);
    const { key, value } = singleEntrySchema.parse(req.body);
    const result = await i18nService.setTranslation(req.params.locale, key, value, req.user?.id);
    res.json({ code: 0, data: result });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ code: 400, msg: '参数校验失败', errors: err.errors });
    res.status(500).json({ code: 500, msg: '保存失败' });
  }
});

adminRouter.post('/:locale/batch', async (req, res) => {
  try {
    validateLocale(req.params.locale);
    const { entries } = batchSchema.parse(req.body);
    const obj = {};
    for (const e of entries) obj[e.key] = e.value;
    const result = await i18nService.importTranslations(req.params.locale, obj);
    res.json({ code: 0, data: result });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ code: 400, msg: '参数校验失败', errors: err.errors });
    res.status(500).json({ code: 500, msg: '批量保存失败' });
  }
});

adminRouter.delete('/:locale/:key', async (req, res) => {
  try {
    validateLocale(req.params.locale);
    await i18nService.deleteTranslation(req.params.locale, req.params.key);
    res.json({ code: 0, msg: '删除成功' });
  } catch (err) {
    res.status(500).json({ code: 500, msg: '删除失败' });
  }
});

adminRouter.post('/:locale/import', async (req, res) => {
  try {
    validateLocale(req.params.locale);
    const data = importBodySchema.parse(req.body);
    const result = await i18nService.importTranslations(req.params.locale, data, req.query.skipEdted === '1');
    res.json({ code: 0, data: result });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ code: 400, msg: '参数校验失败', errors: err.errors });
    res.status(500).json({ code: 500, msg: '导入失败' });
  }
});

adminRouter.get('/:locale/export', async (req, res) => {
  try {
    validateLocale(req.params.locale);
    const data = await i18nService.getTranslations(req.params.locale);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.locale}.json"`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ code: 500, msg: '导出失败' });
  }
});

adminRouter.get('/:locale/logs/:key', async (req, res) => {
  try {
    validateLocale(req.params.locale);
    const logs = await i18nService.getLogs(req.params.locale, req.params.key);
    res.json({ code: 0, data: logs });
  } catch (err) {
    res.status(500).json({ code: 500, msg: '获取日志失败' });
  }
});

export { publicRouter, adminRouter };
