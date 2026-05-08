export default defineNuxtPlugin(() => {
  return {
    provide: {
      toast: {
        success: (msg: string) => (window as any).__toast?.success?.(msg) || alert(msg),
        error: (msg: string) => (window as any).__toast?.error?.(msg) || alert(msg),
        warn: (msg: string) => (window as any).__toast?.warn?.(msg) || alert(msg),
        info: (msg: string) => (window as any).__toast?.info?.(msg) || alert(msg),
      }
    }
  }
})
