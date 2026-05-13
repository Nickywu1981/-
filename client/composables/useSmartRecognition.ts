/**
 * useSmartRecognition — 上传参考图 AI 智能识别产品信息
 * 复用于：图片/视频/文案/海报 各创作页面
 */
export function useSmartRecognition() {
  const refUrl = ref('')
  const loading = ref(false)
  const error = ref('')
  const result = ref<{ productName: string; category: string; features: string[] } | null>(null)

  const featuresText = computed({
    get: () => result.value?.features?.join('\n') || '',
    set: (v: string) => {
      if (result.value) result.value.features = v.split('\n').filter(l => l.trim())
    },
  })

  function setRefImage(url: string) {
    refUrl.value = url
    result.value = null
    error.value = ''
  }

  async function extract() {
    if (!refUrl.value) return
    loading.value = true; error.value = ''
    try {
      const data = await $fetch('/api/detail/extract-product-info', {
        method: 'POST',
        body: { image_url: refUrl.value },
      })
      result.value = {
        productName: data.productName || '',
        category: data.category || '其他',
        features: data.features || [],
      }
    } catch (e: unknown) {
      const err = e as { data?: { message?: string }; message?: string };
      error.value = err?.data?.message || err?.message || '识别失败'
    } finally { loading.value = false }
  }

  function reset() {
    refUrl.value = ''
    loading.value = false
    error.value = ''
    result.value = null
  }

  return { refUrl, loading, error, result, featuresText, setRefImage, extract, reset }
}
