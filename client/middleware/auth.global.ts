/**
 * Movio AI v4.1 — Global Auth Middleware (Nuxt3 Route Guard)
 * httpOnly cookie JWT auth — 开发模式自动放行所有页面
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const publicPaths = [
    '/', '/login', '/register', '/auth/register',
    '/auth/reset-password', '/help', '/compare', '/legal/terms', '/legal/privacy',
    '/forgot-password',
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
  } catch (e: any) {
    if (e?.response?.status === 401 || e?.statusCode === 401) {
      return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
    }
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
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
