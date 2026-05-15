/**
 * Nuxt3 全局错误处理插件 — Vue/Nuxt 生命周期错误捕获
 * Note: $fetch wrapper merged into auth.ts to avoid dual-wrapper conflict
 */
export default defineNuxtPlugin((nuxtApp) => {
  const t = (key: string, options?: any) => (nuxtApp as any).$i18n.t(key, options)
  const getToast = () => (nuxtApp.vueApp.config.globalProperties.$toast || null) as any

  // Vue 应用级错误（组件渲染 / 生命周期 / watch 回调）
  nuxtApp.vueApp.config.errorHandler = (err, _instance, info) => {
    if (import.meta.dev) console.error('[GlobalError]', info, err)
    getToast()?.error?.(t('common.page_error', { message: (err as Error)?.message || t('common.unknown_error') }))
  }

  // Nuxt 服务端/客户端钩子错误
  nuxtApp.hook('vue:error', (err) => {
    if (import.meta.dev) console.error('[NuxtError]', err)
    if (import.meta.client) {
      getToast()?.error?.(t('common.app_error', { message: (err as Error)?.message || t('common.unknown_error') }))
    }
  })
})
