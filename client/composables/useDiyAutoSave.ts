/**
 * DIY 编辑器自动保存 (TypeScript)
 * - 空闲 30 秒后自动保存版本快照
 * - 崩溃恢复检测
 * - 保存状态指示器
 */
import type { DiySection } from '~/types/diy'

interface AutoSaveState {
  lastSaved: Ref<Date | null>
  saving: Ref<boolean>
  saveError: Ref<string | null>
  pendingChanges: Ref<number>
  recovered: Ref<boolean>
  formatLastSaved: () => string
  autoSave: () => Promise<void>
  checkRecovery: () => Promise<{ sections: DiySection[] } | null>
  start: () => void
  stop: () => void
}

export function useDiyAutoSave(
  pageId: Ref<number | null>,
  getSections: () => DiySection[],
  previewMode?: Ref<'mobile' | 'pc'>,
  { delay = 3000 } = {},
): AutoSaveState {
  const lastSaved = ref<Date | null>(null)
  const saving = ref(false)
  const saveError = ref<string | null>(null)
  const pendingChanges = ref(0)
  const recovered = ref(false)

  let timer: ReturnType<typeof setTimeout> | null = null
  let unwatch: (() => void) | null = null
  const { t } = useI18n()

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
      const cfg = { sections: structuredClone(sections) }
      const body: Record<string, any> = previewMode?.value === 'pc'
        ? { pcConfig: cfg }
        : { mobileConfig: cfg }
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
      timer = setTimeout(autoSave, delay)
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
    if (diff < 10000) return t('autoSave.justSaved')
    if (diff < 60000) return t('autoSave.secondsAgo', { n: Math.floor(diff / 1000) })
    return t('autoSave.minutesAgo', { n: Math.floor(diff / 60000) })
  }

  onBeforeUnmount(() => stop())

  return { lastSaved, saving, saveError, pendingChanges, recovered, formatLastSaved, autoSave, checkRecovery, start, stop }
}
