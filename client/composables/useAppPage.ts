/**
 * Movio AI v4.1 — useAppPage
 * G4 前端开发 | 配置化三件套之三
 *
 * 页面级一次性加载: 多个配置组 + 多个字典
 *
 * 用法:
 *   const { configs, dicts, ready } = useAppPage({
 *     configs: ['page.video.header', 'comp.upload', 'comp.task'],
 *     dicts: ['video_duration', 'platform_list'],
 *   })
 *   // ready → configs['page.video.header'].title, dicts['platform_list'].options
 */
import { useSiteConfig } from './useSiteConfig'
import { useAppDict } from './useAppDict'

interface PageLoadOptions {
  configs?: string[]
  dicts?: string[]
}

export function useAppPage(options: PageLoadOptions) {
  const configKeys = options.configs || []
  const dictKeys = options.dicts || []

  // 为每个 config 创建 hook 实例
  const configHooks = configKeys.map(key => ({
    key,
    hook: useSiteConfig(key),
  }))

  // 为每个 dict 创建 hook 实例
  const dictHooks = dictKeys.map(key => ({
    key,
    hook: useAppDict(key),
  }))

  const configs = computed(() => {
    const result: Record<string, any> = {}
    for (const { key, hook } of configHooks) {
      result[key] = hook.config.value
    }
    return result
  })

  const dicts = computed(() => {
    const result: Record<string, any> = {}
    for (const { key, hook } of dictHooks) {
      result[key] = hook.options.value
    }
    return result
  })

  const ready = computed(() => {
    const configsReady = configHooks.every(h => !h.hook.loading.value)
    const dictsReady = dictHooks.every(h => !h.hook.loading.value)
    return configsReady && dictsReady
  })

  const anyFallback = computed(() => configHooks.some(h => h.hook.isFallback.value))

  return { configs, dicts, ready, anyFallback }
}
