/**
 * Nuxt3 全局错误处理插件 — Vue/Nuxt 生命周期错误捕获
 * Note: $fetch wrapper merged into auth.ts to avoid dual-wrapper conflict
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
})
