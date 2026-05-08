/**
 * Auth plugin — ensures cross-origin credentials + 401 redirect.
 * v4.1: httpOnly cookie auth (no localStorage tokens).
 */
export default defineNuxtPlugin(() => {
  const router = useRouter()

  // Ensure all $fetch calls send credentials (httpOnly cookie) cross-origin
  const originalFetch = globalThis.$fetch
  // @ts-expect-error - wrapper type is compatible at runtime
  globalThis.$fetch = function (url: string, opts: any = {}): any {
    if (typeof window !== 'undefined') {
      opts.credentials = opts.credentials || 'include'
    }
    return (originalFetch as any).call(globalThis, url, opts)
  }

  // Intercept fetch for 401 redirect
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
      } catch {
        return origFetch.call(window, input, init)
      }
    }
  }
})
