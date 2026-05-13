/**
 * AI 提示词增强 Composable
 * 调用服务端 /api/images/enhance-prompt 或 /api/posters/enhance-prompt 优化用户提示词
 */
export function usePromptEnhance() {
  const enhancing = ref(false)
  const { t } = useI18n()

  async function enhance(prompt: string, type: 'image' | 'video' | 'poster' = 'image'): Promise<string> {
    enhancing.value = true
    try {
      const endpoint = type === 'poster' ? '/api/posters/enhance-prompt' : '/api/images/enhance-prompt'
      const { data, error } = await useApi().post<{ enhancedPrompt: string }>(endpoint, { prompt })
      if (error.value || !data.value) {
        throw new Error(error.value?.message || t('promptEnhancer.enhanceFailed'))
      }
      return data.value.enhancedPrompt || prompt
    } finally {
      enhancing.value = false
    }
  }

  return { enhancing, enhance }
}
