/**
 * 全局 $fetch 默认配置 — 自动附带 credentials: 'include'
 * 所有 $fetch 调用自动发送 Cookie（JWT auth），无需手动传递
 */
export default defineNuxtPlugin(() => {
  const nuxtApp = useNuxtApp()

  // 保存原始 $fetch 引用
  const _rawFetch = nuxtApp.$fetch

  // 创建带默认值的 $fetch
  const apiFetch = $fetch.create({
    credentials: 'include',
    onRequest({ options }) {
      // 对变更请求注入 CSRF token
      if (options.method && options.method !== 'GET') {
        const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/)
        if (match) {
          options.headers = {
            ...(options.headers as Record<string, string> || {}),
            'x-csrf-token': match[1],
          }
        }
      }
    },
  })

  // 替换全局 $fetch
  nuxtApp.provide('fetch', apiFetch)

  // 同时挂到全局 window 供纯 JS 工具函数使用
  if (typeof window !== 'undefined') {
    (window as any).__apiFetch = apiFetch
  }
})
