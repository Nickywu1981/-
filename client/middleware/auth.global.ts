/**
 * Movio AI v4.1 — Global Auth Middleware (Nuxt3 Route Guard)
 * httpOnly cookie JWT auth — 开发模式自动放行所有页面
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const publicPaths = [
    '/', '/login', '/register', '/auth/register',
    '/auth/reset-password', '/forgot-password', '/help', '/compare', '/legal/terms', '/legal/privacy', '/error',
  ]

  // Redirect-loop guard: track consecutive auth failures per session to break infinite redirect chains
  const REDIRECT_KEY = '_auth_redirect_count'
  const MAX_REDIRECTS = 3
  if (to.path === '/login' || to.path.startsWith('/auth/reset-password')) {
    try { sessionStorage.removeItem(REDIRECT_KEY) } catch {}
  }

  if (publicPaths.includes(to.path) || to.path.startsWith('/legal/') || to.path.startsWith('/help/')) return

  let isAuthenticated = false
  let userRole = ''

  try {
    if (import.meta.server) {
      const apiBase = useRuntimeConfig().public.apiBase
      const data = await $fetch<{ code: number; data?: { role?: string } }>(`${apiBase}/user/profile`, {
        headers: useRequestHeaders(['cookie']) as Record<string, string>,
      })
      isAuthenticated = data?.code === 200
      userRole = data?.data?.role || ''
    } else {
      const data = await $fetch<{ code: number; data?: { role?: string } }>('/api/user/profile', { credentials: 'include' })
      isAuthenticated = data?.code === 200
      userRole = data?.data?.role || ''
    }
  } catch (e: unknown) {
    const err = e as { statusCode?: number; response?: { status?: number }; data?: { code?: number }; cause?: unknown }
    if (err?.statusCode === 401 || err?.response?.status === 401 || err?.data?.code === 401 ||
        err?.statusCode === 403 || err?.response?.status === 403 || err?.data?.code === 403) {
      return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
    }
    // dev mode: backend unavailable → allow UI preview (non-protected pages only)
    if (import.meta.dev) {
      console.info('[auth] dev mode — backend unavailable, previewing UI as anonymous')
      // still block admin/gateway/ops in dev unless explicitly allowed
      if (to.path.startsWith('/admin') || to.path.startsWith('/gateway') || to.path.startsWith('/ops') || to.path.startsWith('/finance')) {
        console.warn(`[auth] dev mode — blocking unauthenticated access to ${to.path}`)
        return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
      }
      return
    }
    console.warn('[auth] API unreachable, allowing navigation:', (err as Error)?.message || err)
  }

  if (!isAuthenticated) {
    try {
      const count = Number(sessionStorage.getItem(REDIRECT_KEY) || '0')
      if (count >= MAX_REDIRECTS) {
        console.error('[auth] redirect-loop detected — halting at current page')
        return
      }
      sessionStorage.setItem(REDIRECT_KEY, String(count + 1))
    } catch {}
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }

  const protectedPrefixes: [string, string[]][] = [
    ['/admin',     ['admin', 'super_admin']],
    ['/gateway',   ['admin', 'super_admin']],
    ['/ops',       ['admin', 'super_admin', 'ops', 'finance']],
    ['/finance',   ['admin', 'super_admin', 'finance']],
  ]
  for (const [prefix, allowed] of protectedPrefixes) {
    if (to.path.startsWith(prefix) && !allowed.includes(userRole)) {
      return navigateTo('/error?code=403')
    }
  }
})
