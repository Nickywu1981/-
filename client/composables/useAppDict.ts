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

interface DictItem {
  item_key: string
  item_value: string
  item_extra?: Record<string, unknown>
}

interface DictResponse {
  code: number
  data?: DictItem[]
}

const cache: Record<string, { data: DictItem[]; ts: number }> = {}
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export function useAppDict(dictKey: string, fallbackList?: DictItem[]) {
  const options = ref<DictItem[]>(cache[dictKey]?.data || fallbackList || [])
  const loading = ref(!cache[dictKey]?.data)
  const apiBase = useRuntimeConfig().public.apiBase || '/api'

  async function fetchDict() {
    const cached = cache[dictKey]
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      options.value = cached.data
      loading.value = false
      return
    }
    loading.value = true
    try {
      const fetcher = import.meta.server ? useRequestFetch() : $fetch
      const res = await fetcher<DictResponse>(`${apiBase}/config/dict/${dictKey}`, { credentials: 'include' })
      if (res.code === 200) {
        cache[dictKey] = { data: res.data || [], ts: Date.now() }
        options.value = cache[dictKey].data
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
