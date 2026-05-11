<!--
  布局：网关中台 (Gateway Middle Platform)
  导航：API网关 / 路由 / 限流 / 监控 / 日志
-->
<template>
  <AdminShell
    brand-name="Movio 网关"
    brand-subtitle="Gateway Console"
    accent-color="#f59e0b"
    :nav-groups="navGroups"
    :breadcrumbs="breadcrumbs"
    back-route="/admin/dashboard"
    back-label="返回总后台"
    @logout="handleLogout"
  >
    <slot />
  </AdminShell>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()

const navGroups = reactive([
  { key: 'overview', icon: '📊', label: '网关总览', open: true,
    items: [{ key: 'dashboard', label: '网关看板', route: '/gateway/dashboard' }] },
  { key: 'routes', icon: '🔀', label: '路由管理', open: true,
    items: [
      { key: 'routes', label: '路由配置', route: '/gateway/routes' },
      { key: 'upstream', label: '上游服务', route: '/gateway/upstream' },
      { key: 'services', label: '服务发现', route: '/gateway/services' },
    ]},
  { key: 'traffic', icon: '⚡', label: '流量控制', open: false,
    items: [
      { key: 'rate-limit', label: '限流规则', route: '/gateway/rate-limit' },
      { key: 'circuit-breaker', label: '熔断降级', route: '/gateway/circuit-breaker' },
      { key: 'load-balance', label: '负载均衡', route: '/gateway/load-balance' },
    ]},
  { key: 'security', icon: '🔐', label: '安全防护', open: false,
    items: [
      { key: 'auth-config', label: '认证配置', route: '/gateway/auth-config' },
      { key: 'ip-block', label: 'IP 黑白名单', route: '/gateway/ip-block' },
      { key: 'waf', label: 'WAF 策略', route: '/gateway/waf' },
    ]},
  { key: 'monitor', icon: '📈', label: '监控告警', open: false,
    items: [
      { key: 'metrics', label: '实时指标', route: '/gateway/metrics' },
      { key: 'alerts', label: '告警规则', route: '/gateway/alerts' },
    ]},
  { key: 'logs', icon: '📝', label: '日志审计', open: false,
    items: [
      { key: 'access-log', label: '访问日志', route: '/gateway/access-log' },
      { key: 'error-log', label: '错误日志', route: '/gateway/error-log' },
    ]},
])

const breadcrumbs = computed(() => {
  const items = [{ label: '网关中台', route: '/gateway/dashboard' }]
  for (const g of navGroups) {
    const it = g.items.find(i => route.path === i.route || route.path.startsWith(i.route + '/'))
    if (it) { items.push({ label: g.label, route: '' }, { label: it.label, route: it.route }); break }
  }
  return items
})

async function handleLogout() {
  try { await $fetch('/api/auth/logout', { method:'POST', credentials:'include' }) } catch (e) { if (import.meta.dev) console.error('Logout error:', e) }
  router.push('/login')
}
definePageMeta({ middleware: ['auth'] })
</script>
