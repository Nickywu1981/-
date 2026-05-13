/**
 * Movio AI v4.1 — Global Auth Middleware (Nuxt3 Route Guard)
 * httpOnly cookie JWT auth — 开发模式自动放行所有页面
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const publicPaths = [
    '/', '/login', '/register', '/auth/register',
    '/auth/reset-password', '/help', '/compare', '/legal/terms', '/legal/privacy',
  ]

  if (publicPaths.includes(to.path) || to.path.startsWith('/legal/')) return

  // 开发模式：后端 DB 不可用时直接放行，方便查看页面 UI
  if (import.meta.dev) return

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
    // 401/403 → 跳转登录
    if (err?.statusCode === 401 || err?.response?.status === 401 || err?.data?.code === 401 ||
        err?.statusCode === 403 || err?.response?.status === 403 || err?.data?.code === 403) {
      return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
    }
    // 网络错误/服务不可用 → 放行，避免服务抖动导致全员掉线
    console.warn('[auth] API unreachable, allowing navigation:', (err as Error)?.message || err)
  }

  if (!isAuthenticated) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }

  if (to.path.startsWith('/admin')) {
    if (!['admin', 'super_admin'].includes(userRole)) {
      return navigateTo('/error?code=403')
    }
  }
})
