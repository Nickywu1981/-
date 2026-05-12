<!--
  布局：运营后台 (Operations Admin)
  导航：运营看板 / 活动 / 内容 / 用户运营 / 推送 / 分析
-->
<template>
  <AdminShell
    brand-name="Movio 运营"
    brand-subtitle="Operations Console"
    accent-color="#3b82f6"
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
  { key: 'overview', icon: '📊', label: '运营总览', open: true,
    items: [{ key: 'dashboard', label: '运营看板', route: '/ops/dashboard' }] },
  { key: 'campaigns', icon: '🎯', label: '活动管理', open: true,
    items: [
      { key: 'campaigns', label: '营销活动', route: '/ops/campaigns' },
      { key: 'coupons', label: '优惠券', route: '/ops/coupons' },
      { key: 'promotions', label: '促销规则', route: '/ops/promotions' },
    ]},
  { key: 'content', icon: '📝', label: '内容运营', open: false,
    items: [
      { key: 'articles', label: '文章管理', route: '/ops/articles' },
      { key: 'banners', label: 'Banner管理', route: '/ops/banners' },
      { key: 'announcements', label: '公告管理', route: '/ops/announcements' },
    ]},
  { key: 'users', icon: '👥', label: '用户运营', open: false,
    items: [
      { key: 'segments', label: '用户分群', route: '/ops/segments' },
      { key: 'tags', label: '标签管理', route: '/ops/tags' },
      { key: 'points', label: '积分规则', route: '/ops/points' },
    ]},
  { key: 'push', icon: '📢', label: '推送触达', open: false,
    items: [
      { key: 'push-tasks', label: '推送任务', route: '/ops/push-tasks' },
      { key: 'templates', label: '消息模板', route: '/ops/templates' },
      { key: 'channels', label: '触达渠道', route: '/ops/channels' },
    ]},
  { key: 'analytics', icon: '📈', label: '数据分析', open: false,
    items: [
      { key: 'reports', label: '运营报表', route: '/ops/reports' },
      { key: 'funnel', label: '转化漏斗', route: '/ops/funnel' },
      { key: 'retention', label: '留存分析', route: '/ops/retention' },
    ]},
])

const breadcrumbs = useAdminBreadcrumbs(navGroups, '运营后台', '/ops/dashboard')

const { logout: handleLogout } = useLogout()
</script>
