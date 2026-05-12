/**
 * i18n-dynamic 客户端插件
 * Phase 2.2: 在 Nuxt 客户端启动时预加载动态翻译
 * 提供全局 $dt() 辅助
 */
export default defineNuxtPlugin(() => {
  const { dt, ready, refresh } = useI18nDynamic()

  return {
    provide: {
      dt: (key: string, params?: Record<string, any>) => dt(key, params),
      i18nReady: ready,
      i18nRefresh: refresh,
    },
  }
})
