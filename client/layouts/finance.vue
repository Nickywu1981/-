<!--
  布局：财务后台 (Finance Admin)
  导航：财务看板 / 交易 / 账单 / 佣金 / 税务 / 报表
-->
<template>
  <AdminShell
    brand-name="Movio 财务"
    brand-subtitle="Finance Console"
    accent-color="#10b981"
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
  { key: 'overview', icon: '📊', label: '财务总览', open: true,
    items: [{ key: 'dashboard', label: '财务看板', route: '/finance/dashboard' }] },
  { key: 'transactions', icon: '💳', label: '交易管理', open: true,
    items: [
      { key: 'orders', label: '订单流水', route: '/finance/orders' },
      { key: 'recharge', label: '充值记录', route: '/finance/recharge' },
      { key: 'refunds', label: '退款管理', route: '/finance/refunds' },
    ]},
  { key: 'billing', icon: '🧾', label: '账单结算', open: false,
    items: [
      { key: 'invoices', label: '发票管理', route: '/finance/invoices' },
      { key: 'settlement', label: '商家结算', route: '/finance/settlement' },
    ]},
  { key: 'commission', icon: '💰', label: '分佣管理', open: false,
    items: [
      { key: 'commission-rules', label: '分佣规则', route: '/finance/commission-rules' },
      { key: 'commission-detail', label: '分佣明细', route: '/finance/commission-detail' },
      { key: 'payout', label: '打款管理', route: '/finance/payout' },
    ]},
  { key: 'tax', icon: '📋', label: '税务管理', open: false,
    items: [
      { key: 'tax-rates', label: '税率配置', route: '/finance/tax-rates' },
      { key: 'tax-reports', label: '税务报表', route: '/finance/tax-reports' },
    ]},
  { key: 'reports', icon: '📈', label: '财务报表', open: false,
    items: [
      { key: 'income-statement', label: '收支报表', route: '/finance/income-statement' },
      { key: 'revenue-trend', label: '收入趋势', route: '/finance/revenue-trend' },
      { key: 'export', label: '报表导出', route: '/finance/export' },
    ]},
])

const breadcrumbs = computed(() => {
  const items = [{ label: '财务后台', route: '/finance/dashboard' }]
  for (const g of navGroups) {
    const it = g.items.find(i => route.path.startsWith(i.route))
    if (it) { items.push({ label: g.label, route: '' }, { label: it.label, route: it.route }); break }
  }
  return items
})

function handleLogout() { router.push('/login') }
definePageMeta({ middleware: ['auth'] })
</script>
