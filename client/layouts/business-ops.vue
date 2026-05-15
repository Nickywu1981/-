<template>
  <div class="business-ops-layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <h1 class="logo">{{ t('business_ops_nav.brand_name') }}</h1>
        <span class="badge">{{ t('business_ops_nav.badge') }}</span>
      </div>
      <nav class="nav">
        <div class="nav-group">
          <p class="nav-label">{{ t('business_ops_nav.section_biz_manage') }}</p>
          <NuxtLink to="/ops/users" class="nav-item" active-class="active">
            <i class="icon-users"></i> {{ t('business_ops_nav.user_manage') }}
          </NuxtLink>
          <NuxtLink to="/admin/enterprises" class="nav-item" active-class="active">
            <i class="icon-building"></i> {{ t('business_ops_nav.enterprise_manage') }}
          </NuxtLink>
          <NuxtLink to="/ops/users" class="nav-item" active-class="active">
            <i class="icon-user-check"></i> {{ t('business_ops_nav.agent_manage') }}
          </NuxtLink>
          <NuxtLink to="/admin/orders" class="nav-item" active-class="active">
            <i class="icon-shopping-cart"></i> {{ t('business_ops_nav.order_manage') }}
          </NuxtLink>
        </div>
        <div class="nav-group">
          <p class="nav-label">{{ t('business_ops_nav.section_ops_config') }}</p>
          <NuxtLink to="/ops/activities" class="nav-item" active-class="active">
            <i class="icon-gift"></i> {{ t('business_ops_nav.activity_config') }}
          </NuxtLink>
          <NuxtLink to="/admin/templates" class="nav-item" active-class="active">
            <i class="icon-layout"></i> {{ t('business_ops_nav.template_market') }}
          </NuxtLink>
          <NuxtLink to="/gateway/dashboard" class="nav-item" active-class="active">
            <i class="icon-toggle-right"></i> {{ t('business_ops_nav.biz_switch') }}
          </NuxtLink>
        </div>
        <div class="nav-group">
          <p class="nav-label">{{ t('business_ops_nav.section_finance_audit') }}</p>
          <NuxtLink to="/finance/reconciliation" class="nav-item" active-class="active">
            <i class="icon-bar-chart"></i> {{ t('business_ops_nav.reconciliation') }}
          </NuxtLink>
          <NuxtLink to="/finance/commission-detail" class="nav-item" active-class="active">
            <i class="icon-dollar-sign"></i> {{ t('business_ops_nav.commission_settlement') }}
          </NuxtLink>
          <NuxtLink to="/admin/moderation" class="nav-item" active-class="active">
            <i class="icon-eye"></i> {{ t('business_ops_nav.content_moderation') }}
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
