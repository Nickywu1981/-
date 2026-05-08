/**
 * Nuxt3 全局错误处理插件
 * 捕获所有未处理的 Vue/Nuxt 错误，自动 Toast 提示
 */
export default defineNuxtPlugin((nuxtApp) => {
  const toast = (nuxtApp.vueApp.config.globalProperties.$toast || { error: console.error }) as any

  // Vue 应用级错误（组件渲染 / 生命周期 / watch 回调）
  nuxtApp.vueApp.config.errorHandler = (err, _instance, info) => {
    console.error('[GlobalError]', info, err)
    toast?.error?.(`页面异常: ${(err as Error)?.message || '未知错误'}`)
  }

  // Nuxt 服务端/客户端钩子错误
  nuxtApp.hook('vue:error', (err) => {
    console.error('[NuxtError]', err)
    if (import.meta.client) {
      toast?.error?.(`应用异常: ${(err as Error)?.message || '未知错误'}`)
    }
  })

  // $fetch 全局错误拦截（在客户端自动提示）
  if (import.meta.client) {
    const originalFetch = globalThis.$fetch as any
    if (originalFetch) {
      (globalThis as any).$fetch = async (...args: any[]): Promise<any> => {
        try {
          const res = await originalFetch(...args)
          if (res?.code >= 400 && res?.code < 600) {
            toast?.error?.(res?.msg || res?.message || '请求失败')
          }
          return res
        } catch (err: any) {
          if (err?.response?.status === 401) return null // auth handled separately
          if (err?.response?.status === 429) {
            toast?.warn?.('请求过于频繁，请稍后再试')
            return null
          }
          toast?.error?.(err?.data?.msg || err?.message || '网络异常')
          throw err
        }
      }
    }
  }
})
