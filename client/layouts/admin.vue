<!--
  布局：平台总管理后台 (Platform Super Admin)
  导航：数据/用户/财务/运营/内容/通信/风控/系统/工具/审计
-->
<template>
  <AdminShell
    :brand-name="$t('admin.brand_name')"
    :brand-subtitle="$t('admin.brand_subtitle')"
    accent-color="#5b5fe3"
    :nav-groups="navGroups"
    :breadcrumbs="breadcrumbs"
    back-route="/"
    :back-label="$t('admin.back_home')"
    @logout="handleLogout"
  >
    <template #topbar-actions>
      <button class="btn btn-sm btn-secondary" @click="router.push('/admin/settings')">{{ $t('admin.system_settings') }}</button>
    </template>
    <slot />
  </AdminShell>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const { logout: handleLogout } = useLogout()

const navGroups = computed(() => [
  { key: 'overview', icon: '📊', label: t('admin.nav_overview'), open: true,
    items: [
      { key: 'dashboard', label: t('admin.dashboard'), route: '/admin/dashboard' },
      { key: 'analytics', label: t('admin.analytics'), route: '/admin/analytics' },
    ]},
  { key: 'users', icon: '👥', label: t('admin.nav_users'), open: false,
    items: [
      { key: 'users', label: t('admin.users'), route: '/admin/users' },
      { key: 'tenants', label: t('admin.tenants'), route: '/admin/tenants' },
      { key: 'tier', label: t('admin.tier'), route: '/admin/tier' },
    ]},
  { key: 'finance', icon: '💳', label: t('admin.nav_finance'), open: false,
    items: [
      { key: 'plans', label: t('admin.plans'), route: '/admin/plans' },
      { key: 'orders', label: t('admin.orders'), route: '/admin/orders' },
      { key: 'recharge', label: t('admin.recharge'), route: '/admin/recharge' },
      { key: 'credits', label: t('admin.credits'), route: '/admin/credits' },
    ]},
  { key: 'ops', icon: '📋', label: t('admin.nav_ops'), open: false,
    items: [
      { key: 'tasks', label: t('admin.tasks'), route: '/admin/tasks' },
      { key: 'automation', label: t('admin.automation'), route: '/admin/automation' },
      { key: 'notifications', label: t('admin.notifications'), route: '/admin/notifications' },
      { key: 'campaigns', label: t('admin.campaigns'), route: '/admin/campaigns' },
      { key: 'coupons', label: t('admin.coupons'), route: '/admin/coupons' },
    ]},
  { key: 'content', icon: '🎨', label: t('admin.nav_content'), open: false,
    items: [
      { key: 'collection', label: t('admin.collection'), route: '/admin/collection' },
      { key: 'prompts', label: t('admin.prompts'), route: '/admin/prompts' },
      { key: 'templates', label: t('admin.templates'), route: '/admin/templates' },
      { key: 'workspace-diy', label: t('admin.workspace_diy'), route: '/admin/workspace-diy' },
    ]},
  { key: 'msg', icon: '📢', label: t('admin.nav_msg'), open: false,
    items: [
      { key: 'sms-templates', label: t('admin.sms_templates'), route: '/admin/sms-templates' },
      { key: 'sms-logs', label: t('admin.sms_logs'), route: '/admin/sms-logs' },
      { key: 'email-templates', label: t('admin.email_templates'), route: '/admin/email-templates' },
    ]},
  { key: 'security', icon: '🛡️', label: t('admin.nav_security'), open: false,
    items: [
      { key: 'moderation', label: t('admin.moderation'), route: '/admin/moderation' },
      { key: 'abuse', label: t('admin.abuse'), route: '/admin/abuse' },
      { key: 'compliance', label: t('admin.compliance'), route: '/admin/compliance' },
    ]},
  { key: 'system', icon: '⚙️', label: t('admin.nav_system'), open: false,
    items: [
      { key: 'site-config', label: t('admin.site_config'), route: '/admin/site-config' },
      { key: 'brand-settings', label: t('admin.brand_settings'), route: '/admin/brand-settings' },
      { key: 'ai-models', label: t('admin.ai_models'), route: '/admin/ai-models' },
      { key: 'multilingual', label: t('admin.multilingual'), route: '/admin/multilingual' },
      { key: 'config', label: t('admin.config'), route: '/admin/config' },
    ]},
  { key: 'tools', icon: '🔧', label: t('admin.nav_tools'), open: false,
    items: [
      { key: 'forms', label: t('admin.forms'), route: '/admin/forms' },
      { key: 'size-templates', label: t('admin.size_templates'), route: '/admin/size-templates' },
    ]},
  { key: 'audit', icon: '📝', label: t('admin.nav_audit'), open: false,
    items: [
      { key: 'logs', label: t('admin.logs'), route: '/admin/logs' },
      { key: 'ai-logs', label: t('admin.ai_logs'), route: '/admin/ai-logs' },
    ]},
])

const breadcrumbs = computed(() => useAdminBreadcrumbs(navGroups.value, t('admin.page_title'), '/admin/dashboard'))

definePageMeta({ middleware: ['auth'] })
</script>
