/**
 * DIY 编辑器自动保存 (TypeScript)
 * - 空闲 30 秒后自动保存版本快照
 * - 崩溃恢复检测
 * - 保存状态指示器
 */
import { AUTO_SAVE_INTERVAL_MS } from '~/constants/ui'
import type { DiySection } from '~/types/diy'

interface AutoSaveState {
  lastSaved: Ref<Date | null>
  saving: Ref<boolean>
  saveError: Ref<string | null>
  pendingChanges: Ref<number>
  recovered: Ref<boolean>
  formatLastSaved: () => string
  autoSave: () => Promise<void>
  checkRecovery: () => Promise<{ id: number; config_json: { sections: DiySection[] } } | null>
  start: () => void
  stop: () => void
}

export function useDiyAutoSave(
  pageId: Ref<number | null>,
  getSections: () => DiySection[],
  { delay = 30000 } = {},
): AutoSaveState {
  const lastSaved = ref<Date | null>(null)
  const saving = ref(false)
  const saveError = ref<string | null>(null)
  const pendingChanges = ref(0)
  const recovered = ref(false)

  let timer: ReturnType<typeof setTimeout> | null = null
  let unwatch: (() => void) | null = null

  function resetTimer() {
    if (timer) clearTimeout(timer)
    pendingChanges.value++
    timer = setTimeout(autoSave, delay)
  }

  async function autoSave() {
    if (!pageId.value) return
    saving.value = true
    saveError.value = null
    try {
      const sections = getSections()
      const body: Record<string, any> = { mobileConfig: { sections: structuredClone(sections) }, pcConfig: { sections: structuredClone(sections) } }
      await $fetch(`/api/diy/${pageId.value}/versions/auto-save`, {
        method: 'POST',
        body,
        credentials: 'include',
      })
      lastSaved.value = new Date()
      pendingChanges.value = 0
    } catch (e: unknown) {
      const err = e as { data?: { msg?: string }; message?: string };
      saveError.value = err?.data?.msg || err.message
      if (timer) clearTimeout(timer)
      timer = setTimeout(autoSave, AUTO_SAVE_INTERVAL_MS)
    } finally {
      saving.value = false
    }
  }

  async function checkRecovery() {
    if (!pageId.value) return null
    try {
      const res = await $fetch(`/api/diy/${pageId.value}/versions/latest-auto`, { credentials: 'include' })
      if (res?.data) {
        const d = res.data
        recovered.value = true
        return d.pc_config || d.mobile_config || d.pcConfig || d.mobileConfig
      }
    } catch { /* no recovery */ }
    return null
  }

  function start() {
    if (unwatch) return
    unwatch = watch(() => getSections(), resetTimer, { deep: true })
  }

  function stop() {
    if (timer) clearTimeout(timer)
    if (unwatch) { unwatch(); unwatch = null }
  }

  function formatLastSaved(): string {
    if (!lastSaved.value) return ''
    const diff = Date.now() - lastSaved.value.getTime()
    if (diff < 10000) return '刚刚保存'
    if (diff < 60000) return `${Math.floor(diff / 1000)}秒前`
    return `${Math.floor(diff / 60000)}分钟前`
  }

  onBeforeUnmount(() => stop())

  return { lastSaved, saving, saveError, pendingChanges, recovered, formatLastSaved, autoSave, checkRecovery, start, stop }
}
