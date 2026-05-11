<!--
  布局：代理端 (Agent Portal) — 使用 AdminShell
  导航：仪表盘 / 分销 / 客户 / 佣金 / 提现 / 素材 / 设置
-->
<template>
  <AdminShell
    brand-name="Movio 代理"
    brand-subtitle="Agent Portal"
    accent-color="#10b981"
    :nav-groups="navGroups"
    :breadcrumbs="breadcrumbs"
    back-route="/workspace"
    back-label="返回工作台"
    @logout="handleLogout"
  >
    <slot />
  </AdminShell>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const navGroups = reactive([
  { key: 'main', icon: '📊', label: '数据总览', open: true,
    items: [{ key: 'dashboard', label: '代理看板', route: '/agent/dashboard' }] },
  { key: 'biz', icon: '🤝', label: '业务管理', open: true,
    items: [
      { key: 'distribution', label: '分销管理', route: '/agent/distribution' },
      { key: 'customers', label: '客户管理', route: '/agent/customers' },
      { key: 'orders', label: '订单管理', route: '/agent/orders' },
    ]},
  { key: 'finance', icon: '💰', label: '财务管理', open: true,
    items: [
      { key: 'commission', label: '佣金明细', route: '/agent/commission' },
      { key: 'withdraw', label: '提现管理', route: '/agent/withdraw' },
    ]},
  { key: 'content', icon: '🎨', label: '素材中心', open: false,
    items: [
      { key: 'materials', label: '营销素材', route: '/agent/materials' },
      { key: 'templates', label: '模板管理', route: '/agent/templates' },
    ]},
  { key: 'settings', icon: '⚙️', label: '设置', open: false,
    items: [
      { key: 'profile', label: '代理资料', route: '/agent/profile' },
      { key: 'team', label: '团队管理', route: '/agent/team' },
    ]},
])

const breadcrumbs = computed(() => {
  const items = [{ label: '代理端', route: '/agent/dashboard' }]
  for (const g of navGroups) {
    const it = g.items.find(i => route.path === i.route || route.path.startsWith(i.route + '/'))
    if (it) { items.push({ label: g.label, route: '' }, { label: it.label, route: it.route }); break }
  }
  return items
})

const { logout: handleLogout } = useLogout()

definePageMeta({ middleware: ['auth'] })
</script>
