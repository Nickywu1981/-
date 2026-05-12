/**
 * useI18nDynamic — 动态翻译加载与合并
 * Phase 2.1: API 拉取 + IndexedDB 缓存 + SSE 热更新 + 静态 fallback
 *
 * 用法:
 *   const { dt, ready, translations } = useI18nDynamic()
 *   // template: {{ dt('nav.home') }}
 *   // script:  dt('common.save')
 *
 * 合并策略: DB动态翻译 > 静态 locale 文件 ($t)
 */
import { ref, onUnmounted } from 'vue'

const IDB_NAME = 'movio-i18n'
const IDB_VERSION = 1
const STORE_NAME = 'translations'

let _db: IDBDatabase | null = null
function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db)
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'locale' })
      }
    }
    req.onsuccess = () => { _db = req.result; resolve(_db!) }
    req.onerror = () => reject(req.error)
  })
}

async function getCached(locale: string): Promise<{ version: number; data: Record<string, string>; fetchedAt: number } | null> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(locale)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => resolve(null)
    })
  } catch { return null }
}

async function setCache(locale: string, data: Record<string, string>, version: number) {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put({ locale, version, data, fetchedAt: Date.now() })
  } catch { /* noop */ }
}

// ========== 全局单例状态 ==========
const dynamicMap = ref<Record<string, string>>({})
const loading = ref(false)
const ready = ref(false)
const error = ref<string | null>(null)
let sseSource: EventSource | null = null

export function useI18nDynamic() {
  const { t, locale } = useI18n()
  // 获取最后成功的 data，避免 reload 时闪烁
  const _lastOK = ref<Record<string, string>>({})

  async function refresh() {
    const loc = locale.value || 'zh'
    loading.value = true
    error.value = null
    try {
      // 检查缓存
      const cached = await getCached(loc)
      try { const r = await $fetch<{ version?: number }>(`/api/i18n/version`).catch(() => ({})); if (cached && r.version === cached.version) { dynamicMap.value = cached.data; ready.value = true; loading.value = false; return } } catch { /* noop */ }

      const res: any = await $fetch(`/api/i18n/${loc}`)
      const data = res.data || res
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        _lastOK.value = data
        dynamicMap.value = data
        ready.value = true
        try { await setCache(loc, data, res.version || Date.now()) } catch { /* noop */ }
      }
    } catch (e: any) {
      if (!ready.value) error.value = e.message || '加载翻译失败'
      // 回退到上次成功的快照
      if (_lastOK.value && Object.keys(_lastOK.value).length) dynamicMap.value = _lastOK.value
    } finally { loading.value = false }
  }

  /**
   * 动态翻译: 优先 DB，fallback 到静态 $t()
   * 支持参数插值: dt('key', { name: 'Movio' })
   */
  function dt(key: string, params?: Record<string, any>): string {
    let text = dynamicMap.value[key]
    if (!text) {
      try { text = t(key) } catch { return key }
      if (!text || text === key) return key
    }
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replaceAll(`{${k}}`, String(v))
      }
    }
    return text
  }

  // 首次加载
  if (import.meta.client && !loading.value && !ready.value) {
    refresh()
  }

  // SSE 订阅
  if (import.meta.client && !sseSource) {
    try {
      sseSource = new EventSource('/api/i18n/version/stream')
      sseSource.onmessage = (event) => {
        try { const { version } = JSON.parse(event.data); if (version) refresh() } catch { /* ignore */ }
      }
    } catch { /* SSE not available */ }
  }

  if (import.meta.client) {
    onUnmounted(() => {
      if (sseSource) { sseSource.close(); sseSource = null; }
    })
  }

  return { translations: dynamicMap, ready, loading, error, dt, refresh }
}
