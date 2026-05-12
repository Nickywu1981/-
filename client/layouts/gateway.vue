<!--
  布局：网关中台 (Gateway Middle Platform)
  导航：API网关 / 路由 / 限流 / 监控 / 日志
-->
<template>
  <AdminShell
    :brand-name="$t('gateway_admin.brand_name')"
    :brand-subtitle="$t('gateway_admin.brand_subtitle')"
    accent-color="#f59e0b"
    :nav-groups="navGroups"
    :breadcrumbs="breadcrumbs"
    back-route="/admin/dashboard"
    :back-label="$t('gateway_admin.back_label')"
    @logout="handleLogout"
  >
    <slot />
  </AdminShell>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const navGroups = computed(() => [
  { key: 'overview', icon: '📊', label: t('gateway_admin.nav_overview'), open: true,
    items: [{ key: 'dashboard', label: t('gateway_admin.gw_dashboard'), route: '/gateway/dashboard' }] },
  { key: 'routes', icon: '🔀', label: t('gateway_admin.nav_routes'), open: true,
    items: [
      { key: 'routes', label: t('gateway_admin.route_config'), route: '/gateway/routes' },
      { key: 'upstream', label: t('gateway_admin.upstream'), route: '/gateway/upstream' },
      { key: 'services', label: t('gateway_admin.services'), route: '/gateway/services' },
    ]},
  { key: 'traffic', icon: '⚡', label: t('gateway_admin.nav_traffic'), open: false,
    items: [
      { key: 'rate-limit', label: t('gateway_admin.rate_limit'), route: '/gateway/rate-limit' },
      { key: 'circuit-breaker', label: t('gateway_admin.circuit_breaker'), route: '/gateway/circuit-breaker' },
      { key: 'load-balance', label: t('gateway_admin.load_balance'), route: '/gateway/load-balance' },
    ]},
  { key: 'security', icon: '🔐', label: t('gateway_admin.nav_security'), open: false,
    items: [
      { key: 'auth-config', label: t('gateway_admin.auth_config'), route: '/gateway/auth-config' },
      { key: 'ip-block', label: t('gateway_admin.ip_block'), route: '/gateway/ip-block' },
      { key: 'waf', label: t('gateway_admin.waf'), route: '/gateway/waf' },
    ]},
  { key: 'monitor', icon: '📈', label: t('gateway_admin.nav_monitor'), open: false,
    items: [
      { key: 'metrics', label: t('gateway_admin.metrics'), route: '/gateway/metrics' },
      { key: 'alerts', label: t('gateway_admin.alerts'), route: '/gateway/alerts' },
    ]},
  { key: 'logs', icon: '📝', label: t('gateway_admin.nav_logs'), open: false,
    items: [
      { key: 'access-log', label: t('gateway_admin.access_log'), route: '/gateway/access-log' },
      { key: 'error-log', label: t('gateway_admin.error_log'), route: '/gateway/error-log' },
    ]},
])

const breadcrumbs = computed(() => useAdminBreadcrumbs(navGroups.value, t('gateway_admin.page_title'), '/gateway/dashboard'))

const { logout: handleLogout } = useLogout()
</script>
