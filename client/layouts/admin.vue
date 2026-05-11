<!--
  布局：平台总管理后台 (Platform Super Admin)
  导航：数据/用户/财务/运营/内容/通信/风控/系统/工具/审计
-->
<template>
  <AdminShell
    brand-name="Movio 总控"
    brand-subtitle="Super Admin"
    accent-color="#4f5cf6"
    :nav-groups="navGroups"
    :breadcrumbs="breadcrumbs"
    back-route="/"
    back-label="返回首页"
    @logout="handleLogout"
  >
    <template #topbar-actions>
      <button class="btn btn-sm btn-secondary" @click="router.push('/admin/settings')">系统设置</button>
    </template>
    <slot />
  </AdminShell>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()

const navGroups = reactive([
  { key: 'overview', icon: '📊', label: '数据总览', open: true,
    items: [
      { key: 'dashboard', label: '数据看板', route: '/admin/dashboard' },
      { key: 'analytics', label: '流量分析', route: '/admin/analytics' },
    ]},
  { key: 'users', icon: '👥', label: '用户体系', open: false,
    items: [
      { key: 'users', label: '用户管理', route: '/admin/users' },
      { key: 'tenants', label: '租户管理', route: '/admin/tenants' },
      { key: 'tier', label: '会员等级', route: '/admin/tier' },
    ]},
  { key: 'finance', icon: '💳', label: '交易财务', open: false,
    items: [
      { key: 'plans', label: '套餐配置', route: '/admin/plans' },
      { key: 'orders', label: '套餐订单', route: '/admin/orders' },
      { key: 'recharge', label: '充值订单', route: '/admin/recharge' },
      { key: 'credits', label: '积分消费', route: '/admin/credits' },
    ]},
  { key: 'ops', icon: '📋', label: '任务运营', open: false,
    items: [
      { key: 'tasks', label: '任务管理', route: '/admin/tasks' },
      { key: 'automation', label: '自动化', route: '/admin/automation' },
      { key: 'notifications', label: '通知管理', route: '/admin/notifications' },
      { key: 'campaigns', label: '运营活动', route: '/admin/campaigns' },
      { key: 'coupons', label: '优惠券', route: '/admin/coupons' },
    ]},
  { key: 'content', icon: '🎨', label: '内容模板', open: false,
    items: [
      { key: 'collection', label: '作品集管理', route: '/admin/collection' },
      { key: 'prompts', label: '提示词模板', route: '/admin/prompts' },
      { key: 'templates', label: '模板管理', route: '/admin/templates' },
      { key: 'workspace-diy', label: '工作台 DIY', route: '/admin/workspace-diy' },
    ]},
  { key: 'msg', icon: '📢', label: '消息通信', open: false,
    items: [
      { key: 'sms-templates', label: '短信模板', route: '/admin/sms-templates' },
      { key: 'sms-logs', label: '短信日志', route: '/admin/sms-logs' },
      { key: 'email-templates', label: '邮件模板', route: '/admin/email-templates' },
    ]},
  { key: 'security', icon: '🛡️', label: '风控合规', open: false,
    items: [
      { key: 'moderation', label: '内容审核', route: '/admin/moderation' },
      { key: 'abuse', label: '滥用监控', route: '/admin/abuse' },
      { key: 'compliance', label: '合规检查', route: '/admin/compliance' },
    ]},
  { key: 'system', icon: '⚙️', label: '系统配置', open: false,
    items: [
      { key: 'site-config', label: '站点配置', route: '/admin/site-config' },
      { key: 'brand-settings', label: '品牌配置', route: '/admin/brand-settings' },
      { key: 'ai-models', label: 'AI 模型', route: '/admin/ai-models' },
      { key: 'multilingual', label: '多语言', route: '/admin/multilingual' },
      { key: 'config', label: '配置中心', route: '/admin/config' },
    ]},
  { key: 'tools', icon: '🔧', label: '工具集', open: false,
    items: [
      { key: 'forms', label: '表单管理', route: '/admin/forms' },
      { key: 'size-templates', label: '尺寸模板', route: '/admin/size-templates' },
    ]},
  { key: 'audit', icon: '📝', label: '审计日志', open: false,
    items: [
      { key: 'logs', label: '操作日志', route: '/admin/logs' },
      { key: 'ai-logs', label: 'AI 调用日志', route: '/admin/ai-logs' },
    ]},
])

const breadcrumbs = computed(() => {
  const items = [{ label: '管理后台', route: '/admin/dashboard' }]
  for (const g of navGroups) {
    const it = g.items.find(i => route.path.startsWith(i.route))
    if (it) { items.push({ label: g.label, route: '' }, { label: it.label, route: it.route }); break }
  }
  return items
})

function handleLogout() {
  router.push('/login')
}

definePageMeta({ middleware: ['auth'] })
</script>
