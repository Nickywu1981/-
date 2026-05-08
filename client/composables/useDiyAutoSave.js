/**
 * DIY 编辑器自动保存
 * - 空闲 30 秒后自动保存版本快照
 * - 网络中断自动恢复
 * - 保存状态指示器
 */
export function useDiyAutoSave(pageId, getSections, { delay = 30000 } = {}) {
  const lastSaved = ref(null)
  const saving = ref(false)
  const saveError = ref(null)
  const pendingChanges = ref(0)
  const recovered = ref(false)

  let timer = null
  let unwatch = null

  function resetTimer() {
    clearTimeout(timer)
    pendingChanges.value++
    timer = setTimeout(autoSave, delay)
  }

  async function autoSave() {
    if (!pageId.value) return
    saving.value = true
    saveError.value = null
    try {
      const sections = getSections()
      await $fetch(`/api/diy/${pageId.value}/versions/auto-save`, {
        method: 'POST',
        body: { configJson: { sections: JSON.parse(JSON.stringify(sections)) } },
      })
      lastSaved.value = new Date()
      pendingChanges.value = 0
    } catch (e) {
      saveError.value = e.data?.msg || e.message
      // 失败后 10 秒重试
      clearTimeout(timer)
      timer = setTimeout(autoSave, 10000)
    } finally {
      saving.value = false
    }
  }

  async function checkRecovery() {
    if (!pageId.value) return
    try {
      const res = await $fetch(`/api/diy/${pageId.value}/versions/latest-auto`)
      if (res?.data && res.data.config_json) {
        recovered.value = res.data
        return res.data
      }
    } catch { /* no recovery */ }
    return null
  }

  function start() {
    if (unwatch) return
    unwatch = watch(() => getSections(), resetTimer, { deep: true })
  }

  function stop() {
    clearTimeout(timer)
    if (unwatch) { unwatch(); unwatch = null }
  }

  function formatLastSaved() {
    if (!lastSaved.value) return ''
    const diff = Date.now() - lastSaved.value.getTime()
    if (diff < 10000) return '刚刚保存'
    if (diff < 60000) return `${Math.floor(diff / 1000)}秒前`
    return `${Math.floor(diff / 60000)}分钟前`
  }

  onBeforeUnmount(() => stop())

  return { lastSaved, saving, saveError, pendingChanges, recovered, formatLastSaved, autoSave, checkRecovery, start, stop }
}
