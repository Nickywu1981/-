/**
 * usePromptEnhancer — 提示词润色 composable
 * 一行调用，所有页面共享，无需逐页嵌入组件
 *
 * 用法:
 *   const { enhance, enhancing, result, apply } = usePromptEnhancer()
 *   await enhance('一件红色连衣裙', 'image')
 *   // result.value → 润色后的提示词
 */
import { ref } from 'vue'
import { useApi } from './useApi'

export function usePromptEnhancer() {
  const api = useApi()
  const enhancing = ref(false)
  const enhanced = ref('')
  const original = ref('')

  async function enhance(prompt: string, type: string = 'image'): Promise<string> {
    if (!prompt?.trim()) return ''
    original.value = prompt
    enhancing.value = true
    try {
      const res = await api.post('/ai/enhance-prompt', { prompt, type })
      enhanced.value = res?.enhanced || res?.result || res?.data?.enhanced || prompt
      return enhanced.value
    } catch {
      enhanced.value = prompt
      return prompt
    } finally {
      enhancing.value = false
    }
  }

  function apply(): string {
    return enhanced.value || original.value
  }

  function reset(): void {
    enhancing.value = false
    enhanced.value = ''
    original.value = ''
  }

  return { enhance, enhancing, enhanced, original, apply, reset }
}
