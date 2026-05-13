/**
 * useI18nAdmin — 后台多语言管理 composable
 * Phase 1.6: CRUD + 搜索 + 导入导出
 */

interface I18nEntry {
  key: string
  namespace: string
  value: string
  updated_at?: string
}

interface I18nAdminPayload {
  code: number
  data?: { entries: I18nEntry[]; namespaces: string[] }
}

interface I18nLogEntry {
  id?: string
  action?: string
  operator?: string
  created_at?: string
  old_value?: string
  new_value?: string
}

interface I18nSearchResult {
  trans_key: string
  namespace: string
  trans_value: string
  updated_at?: string
}

export function useI18nAdmin() {
  const activeLocale = ref('zh')
  const activeNamespace = ref('')
  const searchQuery = ref('')
  const translations = ref<I18nEntry[]>([])
  const namespaces = ref<string[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const editingKey = ref<string | null>(null)

  // 修改追踪
  const pendingChanges = ref<Map<string, string>>(new Map())
  const pendingDelete = ref<Set<string>>(new Set())

  // 新键弹窗
  const showAddModal = ref(false)
  const newKey = ref('')
  const newValue = ref('')

  // 审计日志
  const auditLogs = ref<I18nLogEntry[]>([])
  const showLogModal = ref(false)
  const logTargetKey = ref('')

  async function fetch() {
    loading.value = true
    try {
      const res = await $fetch<I18nAdminPayload>(`/api/admin/i18n/${activeLocale.value}/admin`)
      translations.value = res.data?.entries || []
      namespaces.value = res.data?.namespaces || []
      pendingChanges.value.clear()
      pendingDelete.value.clear()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (import.meta.dev) console.error('[i18n admin] fetch error', msg)
    } finally { loading.value = false }
  }

  function cancelEdit() {
    editingKey.value = null
    pendingChanges.value.delete(editingKey.value!)
  }

  function setEditValue(key: string, value: string) {
    pendingChanges.value.set(key, value)
    editingKey.value = null
  }

  async function saveAll() {
    saving.value = true
    try {
      // 保存修改
      const batch = []
      for (const [key, value] of pendingChanges.value) {
        batch.push({ key, value })
      }
      if (batch.length) {
        await $fetch(`/api/admin/i18n/${activeLocale.value}/batch`, {
          method: 'POST', body: { entries: batch }, credentials: 'include',
        })
      }
      // 执行删除
      for (const key of pendingDelete.value) {
        await $fetch(`/api/admin/i18n/${activeLocale.value}/${encodeURIComponent(key)}`, {
          method: 'DELETE', credentials: 'include',
        })
      }
      await fetch()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (import.meta.dev) console.error('[i18n admin] save error', msg)
    } finally { saving.value = false }
  }

  function markDelete(key: string) {
    pendingDelete.value.add(key)
    pendingChanges.value.delete(key)
  }
  function unmarkDelete(key: string) { pendingDelete.value.delete(key) }
  function isPending(key: string) { return pendingChanges.value.has(key) || pendingDelete.value.has(key) }

  async function addKey() {
    if (!newKey.value || !newValue.value) return
    await $fetch(`/api/admin/i18n/${activeLocale.value}`, {
      method: 'POST', body: { key: newKey.value, value: newValue.value }, credentials: 'include',
    })
    newKey.value = ''
    newValue.value = ''
    showAddModal.value = false
    await fetch()
  }

  async function importJSON(file: File) {
    const text = await file.text()
    let data: Record<string, unknown>
    try { data = JSON.parse(text) } catch { toast.error('无效的 JSON 文件'); return }
    await $fetch(`/api/admin/i18n/${activeLocale.value}/import`, {
      method: 'POST', body: data, params: { skipEdited: '0' }, credentials: 'include',
    })
    await fetch()
  }

  async function showLogs(key: string) {
    logTargetKey.value = key
    showLogModal.value = true
    try {
      const res = await $fetch<{ code: number; data?: I18nLogEntry[] }>(`/api/admin/i18n/${activeLocale.value}/logs/${encodeURIComponent(key)}`)
      auditLogs.value = res.data || []
    } catch (e) { console.warn('[i18nAdmin] 日志加载失败', e); auditLogs.value = [] }
  }

  const displayedTranslations = computed(() => {
    let list = translations.value
    if (activeNamespace.value) {
      list = list.filter(t => t.namespace === activeNamespace.value)
    }
    return list
  })

  const pendingCount = computed(() => pendingChanges.value.size + pendingDelete.value.size)

  return {
    activeLocale, activeNamespace, searchQuery,
    translations, namespaces, loading, saving, editingKey,
    pendingChanges, pendingDelete, pendingCount,
    showAddModal, newKey, newValue,
    auditLogs, showLogModal, logTargetKey,
    displayedTranslations,
    fetch, doSearch, startEdit, cancelEdit, setEditValue,
    saveAll, markDelete, unmarkDelete, isPending,
    addKey, importJSON, showLogs,
  }

  async function doSearch() {
    if (!searchQuery.value.trim()) return fetch()
    loading.value = true
    try {
      const res = await $fetch<{ code: number; data?: I18nSearchResult[] }>(`/api/admin/i18n/${activeLocale.value}/search?q=${encodeURIComponent(searchQuery.value)}`)
      translations.value = (res.data || []).map((r: I18nSearchResult) => ({
        key: r.trans_key,
        namespace: r.namespace,
        value: r.trans_value,
        updated_at: r.updated_at,
      }))
    } catch { /* ignore */ } finally { loading.value = false }
  }
}
