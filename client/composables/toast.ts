// Auto-imported by Nuxt3 — use toast.error() / toast.success() / toast.warn() / toast.info() anywhere
function getToast() {
  if (typeof window !== 'undefined' && (window as any).__toast) {
    return (window as any).__toast;
  }
  if (import.meta.env.DEV) {
    return {
      success: (m: string) => console.debug('[success]', m),
      error: (m: string) => console.error('[error]', m),
      warn: (m: string) => console.warn('[warn]', m),
      info: (m: string) => console.info('[info]', m),
    };
  }
  return { success: noop, error: noop, warn: noop, info: noop };
}
function noop() {}

export const toast = {
  get success() { return getToast().success },
  get error() { return getToast().error },
  get warn() { return getToast().warn },
  get info() { return getToast().info },
}
