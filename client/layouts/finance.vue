<!--
  布局：财务后台 (Finance Admin)
  导航：财务看板 / 交易 / 账单 / 佣金 / 税务 / 报表
-->
<template>
  <AdminShell
    :brand-name="$t('finance_admin.brand_name')"
    :brand-subtitle="$t('finance_admin.brand_subtitle')"
    accent-color="#10b981"
    :nav-groups="navGroups"
    :breadcrumbs="breadcrumbs"
    back-route="/admin/dashboard"
    :back-label="$t('finance_admin.back_label')"
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
  { key: 'overview', icon: '📊', label: t('finance_admin.nav_overview'), open: true,
    items: [{ key: 'dashboard', label: t('finance_admin.finance_dashboard'), route: '/finance/dashboard' }] },
  { key: 'transactions', icon: '💳', label: t('finance_admin.nav_transactions'), open: true,
    items: [
      { key: 'orders', label: t('finance_admin.orders'), route: '/finance/orders' },
      { key: 'recharge', label: t('finance_admin.recharge_records'), route: '/finance/recharge' },
      { key: 'refunds', label: t('finance_admin.refunds'), route: '/finance/refunds' },
    ]},
  { key: 'billing', icon: '🧾', label: t('finance_admin.nav_billing'), open: false,
    items: [
      { key: 'invoices', label: t('finance_admin.invoices'), route: '/finance/invoices' },
      { key: 'settlement', label: t('finance_admin.settlement'), route: '/finance/settlement' },
    ]},
  { key: 'commission', icon: '💰', label: t('finance_admin.nav_commission'), open: false,
    items: [
      { key: 'commission-rules', label: t('finance_admin.commission_rules'), route: '/finance/commission-rules' },
      { key: 'commission-detail', label: t('finance_admin.commission_detail'), route: '/finance/commission-detail' },
      { key: 'payout', label: t('finance_admin.payout'), route: '/finance/payout' },
    ]},
  { key: 'tax', icon: '📋', label: t('finance_admin.nav_tax'), open: false,
    items: [
      { key: 'tax-rates', label: t('finance_admin.tax_rates'), route: '/finance/tax-rates' },
      { key: 'tax-reports', label: t('finance_admin.tax_reports'), route: '/finance/tax-reports' },
    ]},
  { key: 'reports', icon: '📈', label: t('finance_admin.nav_reports'), open: false,
    items: [
      { key: 'income-statement', label: t('finance_admin.income_statement'), route: '/finance/income-statement' },
      { key: 'revenue-trend', label: t('finance_admin.revenue_trend'), route: '/finance/revenue-trend' },
      { key: 'export', label: t('finance_admin.export'), route: '/finance/export' },
    ]},
])

const breadcrumbs = computed(() => useAdminBreadcrumbs(navGroups.value, t('finance_admin.page_title'), '/finance/dashboard'))

const { logout: handleLogout } = useLogout()
</script>
