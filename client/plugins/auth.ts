/**
 * Auth plugin — credentials injection + CSRF header + 401 redirect + global toast.
 * v4.2: httpOnly cookie auth + automatic X-CSRF-Token header for mutating requests.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const router = useRouter()
  const { t } = useI18n()
  const toast = (nuxtApp.vueApp.config.globalProperties.$toast || { error: console.error, warn: console.warn }) as any

  // Helper: read csrf_token from document.cookie
  function getCsrfToken(): string | null {
    if (typeof document === 'undefined') return null
    const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/)
    return match ? match[1] : null
  }

  // Unified $fetch wrapper: credentials + CSRF + 401 redirect + error toast
  const originalFetch = globalThis.$fetch
  // @ts-expect-error - wrapper type is compatible at runtime
  globalThis.$fetch = function (url: string, opts: any = {}): any {
    if (typeof window !== 'undefined') {
      opts.credentials = opts.credentials || 'include'

      // Auto-attach CSRF token for mutating requests
      const method = (opts.method || 'GET').toUpperCase()
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        const csrfToken = getCsrfToken()
        if (csrfToken) {
          opts.headers = opts.headers || {}
          opts.headers['x-csrf-token'] = csrfToken
        }
      }
      const prev = opts.onResponseError
      opts.onResponseError = async function (ctx: any) {
        if (ctx.response?.status === 401) {
          router.push('/login')
        }
        if (prev) return prev(ctx)
      }
    }
    return (originalFetch as any).call(globalThis, url, opts).then((res: any) => {
      if (res?.code >= 400 && res?.code < 600) {
        toast?.error?.(res?.msg || res?.message || t('common.request_failed'))
      }
      return res
    }).catch((err: any) => {
      if (err?.response?.status === 401) throw err // already handled by onResponseError
      if (err?.response?.status === 429) {
        toast?.warn?.(t('common.too_many_requests'))
        return null
      }
      toast?.error?.(err?.data?.msg || err?.message || t('common.network_error'))
      throw err
    })
  }

  // Intercept window.fetch for 401 redirect
  if (typeof window !== 'undefined') {
    const origFetch = window.fetch
    window.fetch = async function (input: any, init: any = {}) {
      try {
        init.credentials = init.credentials || 'include'
        const res = await origFetch.call(window, input, init)
        if (res.status === 401) {
          router.push('/login')
        }
        return res
      } catch (err: any) {
        if (import.meta.dev) console.warn('[auth fetch] 请求增强失败，使用原始fetch', err?.message || err)
        return origFetch.call(window, input, init)
      }
    }
  }
})
