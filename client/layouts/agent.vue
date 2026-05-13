<!--
  布局：代理端 (Agent Portal) — 使用 AdminShell
  导航：仪表盘 / 分销 / 客户 / 佣金 / 提现 / 素材 / 设置
-->
<template>
  <AdminShell
    :brand-name="$t('agent_portal.brand_name')"
    :brand-subtitle="$t('agent_portal.brand_subtitle')"
    accent-color="#10b981"
    :nav-groups="navGroups"
    :breadcrumbs="breadcrumbs"
    back-route="/workspace"
    :back-label="$t('agent_portal.back_label')"
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
  { key: 'main', icon: '📊', label: t('agent_portal.nav_main'), open: true,
    items: [{ key: 'dashboard', label: t('agent_portal.agent_dashboard'), route: '/agent/dashboard' }] },
  { key: 'biz', icon: '🤝', label: t('agent_portal.nav_biz'), open: true,
    items: [
      { key: 'distribution', label: t('agent_portal.distribution'), route: '/agent/distribution' },
      { key: 'customers', label: t('agent_portal.customers'), route: '/agent/customers' },
      { key: 'orders', label: t('agent_portal.orders'), route: '/agent/orders' },
    ]},
  { key: 'finance', icon: '💰', label: t('agent_portal.nav_finance'), open: true,
    items: [
      { key: 'commission', label: t('agent_portal.commission'), route: '/agent/commission' },
      { key: 'withdraw', label: t('agent_portal.withdraw'), route: '/agent/withdraw' },
    ]},
  { key: 'content', icon: '🎨', label: t('agent_portal.nav_content'), open: false,
    items: [
      { key: 'materials', label: t('agent_portal.materials'), route: '/agent/materials' },
      { key: 'templates', label: t('agent_portal.templates'), route: '/agent/templates' },
    ]},
  { key: 'settings', icon: '⚙️', label: t('agent_portal.nav_settings'), open: false,
    items: [
      { key: 'profile', label: t('agent_portal.profile'), route: '/agent/profile' },
      { key: 'team', label: t('agent_portal.team'), route: '/agent/team' },
    ]},
])

const breadcrumbs = computed(() => useAdminBreadcrumbs(navGroups.value, t('agent_portal.page_title'), '/agent/dashboard'))

const { logout: handleLogout } = useLogout()

definePageMeta({ middleware: ['auth'] })
</script>
