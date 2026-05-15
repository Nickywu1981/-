export default defineNuxtPlugin(() => {
  return {
    provide: {
      toast: {
        success: (msg: string) => (window as any).__toast?.success?.(msg) || console.log('[toast]', msg),
        error: (msg: string) => (window as any).__toast?.error?.(msg) || console.error('[toast]', msg),
        warn: (msg: string) => (window as any).__toast?.warn?.(msg) || console.warn('[toast]', msg),
        info: (msg: string) => (window as any).__toast?.info?.(msg) || console.info('[toast]', msg),
      }
    }
  }
})
