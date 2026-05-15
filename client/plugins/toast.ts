export default defineNuxtPlugin(() => {
  return {
    provide: {
      toast: {
        success: (msg: string) => window.__toast?.success?.(msg) || console.log('[toast]', msg),
        error: (msg: string) => window.__toast?.error?.(msg) || console.error('[toast]', msg),
        warn: (msg: string) => window.__toast?.warn?.(msg) || console.warn('[toast]', msg),
        info: (msg: string) => window.__toast?.info?.(msg) || console.info('[toast]', msg),
      }
    }
  }
})
