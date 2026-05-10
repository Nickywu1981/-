/**
 * Auth plugin — credentials injection + 401 redirect + global toast.
 * v4.1: httpOnly cookie auth (no localStorage tokens).
 */
export default defineNuxtPlugin((nuxtApp) => {
  const router = useRouter()
  const toast = (nuxtApp.vueApp.config.globalProperties.$toast || { error: console.error, warn: console.warn }) as any

  // Unified $fetch wrapper: credentials + 401 redirect + error toast
  const originalFetch = globalThis.$fetch
  // @ts-expect-error - wrapper type is compatible at runtime
  globalThis.$fetch = function (url: string, opts: any = {}): any {
    if (typeof window !== 'undefined') {
      opts.credentials = opts.credentials || 'include'
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
        toast?.error?.(res?.msg || res?.message || '请求失败')
      }
      return res
    }).catch((err: any) => {
      if (err?.response?.status === 401) throw err // already handled by onResponseError
      if (err?.response?.status === 429) {
        toast?.warn?.('请求过于频繁，请稍后再试')
        return null
      }
      toast?.error?.(err?.data?.msg || err?.message || '网络异常')
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
        console.warn('[auth fetch] 请求增强失败，使用原始fetch', err?.message || err)
        return origFetch.call(window, input, init)
      }
    }
  }
})
