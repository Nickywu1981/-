/**
 * usePromptEnhance — AI 提示词增强请求
 * 增强失败自动降级返回原提示词，不影响主流程
 *
 * 用法:
 *   const { enhancing, enhance } = usePromptEnhance()
 *   const improved = await enhance('红色连衣裙', 'image')
 */
export function usePromptEnhance() {
  const enhancing = ref(false)
  const apiBase = useRuntimeConfig().public.apiBase || '/api'

  async function enhance(prompt: string, type: string = 'image'): Promise<string> {
    enhancing.value = true
    try {
      const res: any = await $fetch(`${apiBase}/ai/enhance-prompt`, {
        method: 'POST',
        body: { prompt, type },
        credentials: 'include',
      })
      if (res.code === 200) return res.data.enhanced_prompt || prompt
      return prompt
    } catch {
      return prompt // 降级返回原提示词
    } finally {
      enhancing.value = false
    }
  }

  return { enhancing, enhance }
}
