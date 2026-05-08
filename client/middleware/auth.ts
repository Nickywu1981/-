/**
 * Route middleware — 保护需认证页面。
 * 通过 cookie 中的 httpOnly token 自动认证（由服务端设置）。
 * 未登录时跳转 /login。
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (typeof window === 'undefined') return // skip SSR

  // 检查是否有 cookie（服务端登录时会设置 token cookie）
  const hasCookie = document.cookie.split(';').some(c => c.trim().startsWith('token='))
  if (hasCookie) return // 有 cookie，放行

  // 无 cookie，尝试调用 /api/user/profile 验证
  try {
    const cfg = useRuntimeConfig()
    const res = await fetch(`${cfg.public.apiBase}/user/profile`, { credentials: 'include' })
    if (res.ok) return // API 验证通过，放行
  } catch {
    // API 不可达，按未登录处理
  }

  // 公开页面直接放行
  const publicPaths = ['/login', '/register', '/forgot-password', '/', '/privacy', '/terms', '/help', '/compare']
  if (publicPaths.some(p => to.path === p || to.path.startsWith(p + '/'))) return

  // 其他页面跳转登录
  return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
})
