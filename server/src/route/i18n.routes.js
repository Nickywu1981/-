/**
 * i18n API Routes — 动态翻译 CRUD + SSE
 * Phase 1.4
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
import * as i18nService from '../services/i18n.service.js';
import logger from '../utils/logger.js';

const router = Router();

// ========== 公开接口 ==========

/** 获取某语言全量翻译 { "nav.home": "首页", ... } */
router.get('/:locale', async (req, res) => {
  try {
    const data = await i18nService.getTranslations(req.params.locale);
    res.json({ code: 0, data });
  } catch (err) {
    logger.error('[i18n] getTranslations', { locale: req.params.locale, error: err.message });
    res.status(500).json({ code: 500, msg: '获取翻译失败' });
  }
});

/** 获取某命名空间翻译 */
router.get('/:locale/:namespace', async (req, res) => {
  try {
    const data = await i18nService.getTranslationsByNamespace(req.params.locale, req.params.namespace);
    res.json({ code: 0, data });
  } catch (err) {
    res.status(500).json({ code: 500, msg: '获取翻译失败' });
  }
});

/** SSE: i18n 版本推送 */
router.get('/version/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write(`data: ${JSON.stringify({ version: i18nService.getI18nVersion() })}\n\n`);

  const onVersion = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  // 监听 i18n 版本事件
  import('../services/config-version.service.js').then(mod => {
    if (mod.versionEmitter) mod.versionEmitter.on('i18n-version', onVersion);
  }).catch(() => {});

  req.on('close', () => {
    import('../services/config-version.service.js').then(mod => {
      if (mod.versionEmitter) mod.versionEmitter.off('i18n-version', onVersion);
    }).catch(() => {});
  });
});

// ========== 管理接口 ==========

/** 管理端获取翻译（含元数据） */
router.get('/:locale/admin', async (req, res) => {
  try {
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

/** 搜索 */
router.get('/:locale/search', async (req, res) => {
  try {
    const rows = await i18nService.searchTranslations(req.params.locale, req.query.q || '');
    res.json({ code: 0, data: rows });
  } catch (err) {
    res.status(500).json({ code: 500, msg: '搜索失败' });
  }
});

/** 更新/新增单条 */
router.post('/:locale', async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) return res.status(400).json({ code: 400, msg: '缺少 key 或 value' });
    const result = await i18nService.setTranslation(req.params.locale, key, value, req.user?.id);
    res.json({ code: 0, data: result });
  } catch (err) {
    res.status(500).json({ code: 500, msg: '保存失败' });
  }
});

/** 批量 upsert */
router.post('/:locale/batch', async (req, res) => {
  try {
    const { entries } = req.body;
    if (!Array.isArray(entries)) return res.status(400).json({ code: 400, msg: 'entries 必须是数组' });
    const obj = {};
    for (const e of entries) obj[e.key] = e.value;
    const result = await i18nService.importTranslations(req.params.locale, obj);
    res.json({ code: 0, data: result });
  } catch (err) {
    res.status(500).json({ code: 500, msg: '批量保存失败' });
  }
});

/** 删除 */
router.delete('/:locale/:key', async (req, res) => {
  try {
    await i18nService.deleteTranslation(req.params.locale, req.params.key);
    res.json({ code: 0, msg: '删除成功' });
  } catch (err) {
    res.status(500).json({ code: 500, msg: '删除失败' });
  }
});

/** 导入 JSON */
router.post('/:locale/import', async (req, res) => {
  try {
    const data = req.body;
    if (typeof data !== 'object') return res.status(400).json({ code: 400, msg: '必须是 JSON 对象' });
    const result = await i18nService.importTranslations(req.params.locale, data, req.query.skipEdted === '1');
    res.json({ code: 0, data: result });
  } catch (err) {
    res.status(500).json({ code: 500, msg: '导入失败' });
  }
});

/** 导出 JSON */
router.get('/:locale/export', async (req, res) => {
  try {
    const data = await i18nService.getTranslations(req.params.locale);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.locale}.json"`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ code: 500, msg: '导出失败' });
  }
});

/** 变更日志 */
router.get('/:locale/logs/:key', async (req, res) => {
  try {
    const logs = await i18nService.getLogs(req.params.locale, req.params.key);
    res.json({ code: 0, data: logs });
  } catch (err) {
    res.status(500).json({ code: 500, msg: '获取日志失败' });
  }
});

export default router;
