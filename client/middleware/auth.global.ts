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
    // 401 = token 过期/无效 → 重定向登录
    if (e?.response?.status === 401 || e?.statusCode === 401) {
      return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
    }
    // 5xx/网络错误：放行页面渲染（不停机体验），页面 API 自行兜底
    return
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
