/**
 * Movio AI v4.1 — Global Auth Middleware (Nuxt3 Route Guard)
 * httpOnly cookie JWT auth — 验证方式为 API 调用而非读取 cookie
 */
export default defineNuxtRouteMiddleware(async (to) => {
  // 公开路由
  const publicPaths = [
    '/', '/login', '/register', '/auth/register',
    '/auth/reset-password', '/help', '/compare', '/legal/terms', '/legal/privacy',
    '/forgot-password',
  ]

  if (publicPaths.includes(to.path) || to.path.startsWith('/legal/')) return

  let isAuthenticated = false
  let userRole = ''

  try {
    if (import.meta.server) {
      // SSR: 直连 Express 后端，绕过 Nuxt Nitro 避免死循环
      const apiBase = useRuntimeConfig().public.apiBase
      const data: any = await $fetch(`${apiBase}/user/profile`, {
        headers: useRequestHeaders(['cookie']) as Record<string, string>,
      })
      isAuthenticated = data?.code === 200
      userRole = data?.data?.role || ''
    } else {
      // 客户端: 发送 httpOnly cookie
      const data: any = await $fetch('/api/user/profile', { credentials: 'include' })
      isAuthenticated = data?.code === 200
      userRole = data?.data?.role || ''
    }
  } catch (e: any) {
    // 只在明确的 401 时跳转登录；网络/5xx 错误允许页面继续渲染
    if (e?.response?.status === 401 || e?.statusCode === 401) return
    // 其他错误静默降级，页面以未认证状态渲染
  }

  if (!isAuthenticated) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }

  // 管理员路由保护
  const adminOnlyPaths = ['/admin', '/admin/config', '/admin/users']
  if (adminOnlyPaths.some(p => to.path.startsWith(p))) {
    if (!['admin', 'super_admin'].includes(userRole)) {
      return navigateTo('/error?code=403')
    }
  }
})
