/**
 * i18n-dynamic 客户端插件
 * 在 Nuxt 客户端启动时预加载动态翻译，触发 useI18nDynamic 侧效应刷新
 */
export default defineNuxtPlugin(() => {
  useI18nDynamic() // 侧效应：自动触发 refresh()
})
