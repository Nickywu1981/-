<template>
  <div class="business-ops-layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <h1 class="logo">Movio AI</h1>
        <span class="badge">运营后台</span>
      </div>
      <nav class="nav">
        <div class="nav-group">
          <p class="nav-label">业务管理</p>
          <NuxtLink to="/ops/users" class="nav-item" active-class="active">
            <i class="icon-users"></i> 用户管理
          </NuxtLink>
          <NuxtLink to="/admin/enterprises" class="nav-item" active-class="active">
            <i class="icon-building"></i> 企业管理
          </NuxtLink>
          <NuxtLink to="/ops/users" class="nav-item" active-class="active">
            <i class="icon-user-check"></i> 代理管理
          </NuxtLink>
          <NuxtLink to="/admin/orders" class="nav-item" active-class="active">
            <i class="icon-shopping-cart"></i> 订单管理
          </NuxtLink>
        </div>
        <div class="nav-group">
          <p class="nav-label">运营配置</p>
          <NuxtLink to="/ops/activities" class="nav-item" active-class="active">
            <i class="icon-gift"></i> 活动配置
          </NuxtLink>
          <NuxtLink to="/admin/templates" class="nav-item" active-class="active">
            <i class="icon-layout"></i> 模板市场
          </NuxtLink>
          <NuxtLink to="/gateway/dashboard" class="nav-item" active-class="active">
            <i class="icon-toggle-right"></i> 业务开关
          </NuxtLink>
        </div>
        <div class="nav-group">
          <p class="nav-label">财务与审核</p>
          <NuxtLink to="/finance/reconciliation" class="nav-item" active-class="active">
            <i class="icon-bar-chart"></i> 分账对账
          </NuxtLink>
          <NuxtLink to="/finance/commission-detail" class="nav-item" active-class="active">
            <i class="icon-dollar-sign"></i> 佣金结算
          </NuxtLink>
          <NuxtLink to="/admin/moderation" class="nav-item" active-class="active">
            <i class="icon-eye"></i> 内容审核
          </NuxtLink>
        </div>
      </nav>
    </aside>
    <main class="main">
      <header class="topbar">
        <span class="role-badge">{{ currentRoleLabel }}</span>
        <span class="user-info">{{ user?.username }}</span>
      </header>
      <div class="content">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/useAuthStore'
import { useI18n } from 'vue-i18n'

const auth = useAuthStore()
const user = computed(() => auth.user)
const { t } = useI18n()

const currentRoleLabel = computed(() => {
  const role = user.value?.role
  const map: Record<string, string> = {
    admin: t('roles.admin'),
    ops: t('roles.ops'),
    finance: t('roles.finance'),
    auditor: t('roles.auditor'),
  }
  return map[role || ''] || role || ''
})
</script>
