<!--
  布局：运营后台 (Operations Admin)
  导航：运营看板 / 活动 / 内容 / 用户运营 / 推送 / 分析
-->
<template>
  <AdminShell
    :brand-name="$t('ops_admin.brand_name')"
    :brand-subtitle="$t('ops_admin.brand_subtitle')"
    accent-color="#3b82f6"
    :nav-groups="navGroups"
    :breadcrumbs="breadcrumbs"
    back-route="/admin/dashboard"
    :back-label="$t('ops_admin.back_label')"
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
  { key: 'overview', icon: '📊', label: t('ops_admin.nav_overview'), open: true,
    items: [{ key: 'dashboard', label: t('ops_admin.ops_dashboard'), route: '/ops/dashboard' }] },
  { key: 'campaigns', icon: '🎯', label: t('ops_admin.nav_campaigns'), open: true,
    items: [
      { key: 'campaigns', label: t('ops_admin.campaigns'), route: '/ops/campaigns' },
      { key: 'coupons', label: t('ops_admin.coupons'), route: '/ops/coupons' },
      { key: 'promotions', label: t('ops_admin.promotions'), route: '/ops/promotions' },
    ]},
  { key: 'content', icon: '📝', label: t('ops_admin.nav_content'), open: false,
    items: [
      { key: 'articles', label: t('ops_admin.articles'), route: '/ops/articles' },
      { key: 'banners', label: t('ops_admin.banners'), route: '/ops/banners' },
      { key: 'announcements', label: t('ops_admin.announcements'), route: '/ops/announcements' },
    ]},
  { key: 'users', icon: '👥', label: t('ops_admin.nav_users'), open: false,
    items: [
      { key: 'segments', label: t('ops_admin.segments'), route: '/ops/segments' },
      { key: 'tags', label: t('ops_admin.tags'), route: '/ops/tags' },
      { key: 'points', label: t('ops_admin.points_rules'), route: '/ops/points' },
    ]},
  { key: 'push', icon: '📢', label: t('ops_admin.nav_push'), open: false,
    items: [
      { key: 'push-tasks', label: t('ops_admin.push_tasks'), route: '/ops/push-tasks' },
      { key: 'templates', label: t('ops_admin.msg_templates'), route: '/ops/templates' },
      { key: 'channels', label: t('ops_admin.channels'), route: '/ops/channels' },
    ]},
  { key: 'analytics', icon: '📈', label: t('ops_admin.nav_analytics'), open: false,
    items: [
      { key: 'reports', label: t('ops_admin.reports'), route: '/ops/reports' },
      { key: 'funnel', label: t('ops_admin.funnel'), route: '/ops/funnel' },
      { key: 'retention', label: t('ops_admin.retention'), route: '/ops/retention' },
    ]},
])

const breadcrumbs = computed(() => useAdminBreadcrumbs(navGroups.value, t('ops_admin.page_title'), '/ops/dashboard'))

const { logout: handleLogout } = useLogout()
</script>
