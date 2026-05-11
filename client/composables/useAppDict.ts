/**
 * Movio AI v4.1 — useAppDict
 * G4 前端开发 | 配置化三件套之二
 *
 * 从后端获取字典选项列表 (下拉选项/分类/枚举)
 *
 * 用法:
 *   const { options, loading } = useAppDict('platform_list')
 *   // options = [{ item_key:'douyin', item_value:'抖音', item_extra:{ratio:'9:16',format:'mp4'} }, ...]
 */
const cache: Record<string, any[]> = {}

export function useAppDict(dictKey: string, fallbackList?: any[]) {
  const options = ref<any[]>(cache[dictKey] || fallbackList || [])
  const loading = ref(!cache[dictKey])
  const apiBase = useRuntimeConfig().public.apiBase || '/api'

  async function fetchDict() {
    if (cache[dictKey]) {
      options.value = cache[dictKey]
      loading.value = false
      return
    }
    loading.value = true
    try {
      const fetcher = import.meta.server ? useRequestFetch() : $fetch
      const res: any = await fetcher(`${apiBase}/config/dict/${dictKey}`, { credentials: 'include' })
      if (res.code === 200) {
        cache[dictKey] = res.data || []
        options.value = cache[dictKey]
      }
    } catch (e) {
      if (import.meta.dev) console.warn(`[useAppDict] ${dictKey} 加载失败`, e)
      if (fallbackList?.length && options.value.length === 0) {
        options.value = fallbackList
      }
    } finally {
      loading.value = false
    }
  }

  if (import.meta.client) {
    onMounted(() => fetchDict())
  }

  /**
   * 根据 item_key 查找字典项
   */
  function findByKey(key: string) {
    return options.value.find(o => o.item_key === key)
  }

  return { options, loading, findByKey, refresh: fetchDict }
}
