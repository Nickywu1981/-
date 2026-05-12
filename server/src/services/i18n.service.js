/**
 * i18n Service — 动态翻译业务逻辑
 * Phase 1.3: Redis缓存 + single-flight + SSE广播
 */
import * as i18nDao from '../dao/i18nDao.js';
import { cacheGet, cacheSet, cacheDel } from '../dao/redis.js';
import logger from '../utils/logger.js';

const CACHE_PREFIX = 'i18n:';
const CACHE_TTL = 600;
const _inflight = new Map();

// 解析完整 key (如 "nav.home") 为 namespace + key
function parseKey(transKey) {
  const dot = transKey.indexOf('.');
  return {
    namespace: dot > 0 ? transKey.substring(0, dot) : 'common',
    key: transKey,
  };
}

export async function getTranslations(locale) {
  const cacheKey = CACHE_PREFIX + locale;
  try { const cached = await cacheGet(cacheKey); if (cached) return JSON.parse(cached); } catch { /* ignore */ }

  if (_inflight.has(cacheKey)) return _inflight.get(cacheKey);
  const promise = (async () => {
    try { const recheck = await cacheGet(cacheKey); if (recheck) return JSON.parse(recheck); } catch { /* ignore */ }
    const rows = await i18nDao.getAll(locale);
    const result = {};
    for (const r of rows) result[r.trans_key] = r.trans_value;
    try { await cacheSet(cacheKey, JSON.stringify(result), CACHE_TTL); } catch { /* ignore */ }
    return result;
  })();
  _inflight.set(cacheKey, promise);
  try { return await promise; } finally { _inflight.delete(cacheKey); }
}

export async function getTranslationsByNamespace(locale, ns) {
  const all = await getTranslations(locale);
  const result = {};
  for (const [key, value] of Object.entries(all)) {
    if (key.startsWith(ns + '.') || key === ns) result[key] = value;
  }
  return result;
}

export async function searchTranslations(locale, query) {
  const rows = await i18nDao.search(locale, query);
  return rows;
}

export async function setTranslation(locale, transKey, transValue, changedBy) {
  const existing = await i18nDao.getByKey(locale, transKey);
  const { namespace } = parseKey(transKey);
  await i18nDao.upsert(locale, namespace, transKey, transValue, changedBy);
  await i18nDao.insertLog(locale, transKey, existing?.trans_value || '', transValue, changedBy);
  try { await cacheDel(CACHE_PREFIX + locale); } catch { /* ignore */ }
  try { await broadcastI18nVersion(); } catch { /* ignore */ }
  return { locale, key: transKey, oldValue: existing?.trans_value || '', newValue: transValue };
}

export async function importTranslations(locale, entries, skipEdited = false) {
  const batch = [];
  for (const [key, value] of Object.entries(entries)) {
    if (skipEdited) {
      const existing = await i18nDao.getByKey(locale, key);
      if (existing) continue; // 跳过已编辑的
    }
    const { namespace } = parseKey(key);
    batch.push({ namespace, key, value });
  }
  const affected = await i18nDao.upsertBatch(locale, batch);
  try { await cacheDel(CACHE_PREFIX + locale); } catch { /* ignore */ }
  return { imported: batch.length, affected };
}

export async function deleteTranslation(locale, transKey) {
  await i18nDao.remove(locale, transKey);
  try { await cacheDel(CACHE_PREFIX + locale); } catch { /* ignore */ }
}

export async function getLogs(locale, transKey) {
  return i18nDao.listLogs(locale, transKey);
}

export async function getNamespaces(locale) {
  return i18nDao.getNamespaces(locale);
}

/* SSE version management — import from config-version service at runtime to avoid circular deps */
let _getVersion, _bumpVersion, _getVersionEmitter;
function _lazyInit() {
  if (!_getVersion) {
    // 延迟导入避免循环依赖
    import('./config-version.service.js').then(mod => {
      if (!mod.getI18nVersion) {
        let i18nVersion = 0;
        mod._i18nVersion = () => i18nVersion;
        mod._bumpI18nVersion = () => ++i18nVersion;
      }
    }).catch(() => { /* standalone mode, no SSE */ });
  }
}

let i18nVersion = 0;
export function getI18nVersion() { return i18nVersion; }
export async function broadcastI18nVersion() {
  i18nVersion++;
  try {
    const { EventEmitter } = await import('events');
    const emitter = (await import('./config-version.service.js')).versionEmitter || new EventEmitter();
    emitter.emit('i18n-version', { version: i18nVersion });
  } catch { /* noop */ }
}
