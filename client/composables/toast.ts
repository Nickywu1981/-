// Auto-imported by Nuxt3 — use toast.error() / toast.success() / toast.warn() / toast.info() anywhere
function getToast() {
  return (typeof window !== 'undefined' && (window as any).__toast) || {
    success: (m: string) => console.log('[success]', m),
    error: (m: string) => console.error('[error]', m),
    warn: (m: string) => console.warn('[warn]', m),
    info: (m: string) => console.info('[info]', m),
  }
}

export const toast = {
  get success() { return getToast().success },
  get error() { return getToast().error },
  get warn() { return getToast().warn },
  get info() { return getToast().info },
}
