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
          <NuxtLink to="/ops/enterprises" class="nav-item" active-class="active">
            <i class="icon-building"></i> {{ t('business_ops_nav.enterprise_manage') }}
          </NuxtLink>
          <NuxtLink to="/ops/agents" class="nav-item" active-class="active">
            <i class="icon-user-check"></i> {{ t('business_ops_nav.agent_manage') }}
          </NuxtLink>
          <NuxtLink to="/finance/orders" class="nav-item" active-class="active">
            <i class="icon-shopping-cart"></i> {{ t('business_ops_nav.order_manage') }}
          </NuxtLink>
        </div>
        <div class="nav-group">
          <p class="nav-label">{{ t('business_ops_nav.section_ops_config') }}</p>
          <NuxtLink to="/ops/activities" class="nav-item" active-class="active">
            <i class="icon-gift"></i> {{ t('business_ops_nav.activity_config') }}
          </NuxtLink>
          <!-- TODO: /admin/templates 待迁移至 /ops/templates -->
          <NuxtLink to="/ops/templates" class="nav-item" active-class="active">
            <i class="icon-layout"></i> {{ t('business_ops_nav.template_market') }}
          </NuxtLink>
          <NuxtLink to="/ops/biz-switch" class="nav-item" active-class="active">
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
          <!-- TODO: /admin/moderation 待迁移至 /ops/moderation -->
          <NuxtLink to="/ops/moderation" class="nav-item" active-class="active">
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

<style scoped>
.business-ops-layout {
  display: flex; min-height: 100vh; background: var(--bg-page);
}
.sidebar {
  width: 240px; min-width: 240px; background: var(--bg-card);
  border-right: 1px solid var(--border, #e5e5e5);
  display: flex; flex-direction: column; padding: 0;
}
.sidebar-header {
  padding: 20px 20px 12px; border-bottom: 1px solid var(--border, #e5e5e5);
}
.logo { font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0; }
.badge {
  display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 4px;
  background: var(--bg-accent); color: var(--brand); margin-top: 4px;
}
.nav { flex: 1; overflow-y: auto; padding: 12px 0; }
.nav-group { padding: 0 12px; margin-bottom: 8px; }
.nav-label {
  font-size: 11px; font-weight: 600; text-transform: uppercase;
  color: var(--text-muted); padding: 8px 8px 4px; margin: 0;
  letter-spacing: 0.5px;
}
.nav-item {
  display: flex; align-items: center; gap: 8px; padding: 8px 12px;
  border-radius: 8px; font-size: 14px; color: var(--text-secondary);
  text-decoration: none; transition: background .15s, color .15s;
}
.nav-item:hover { background: var(--bg-hover); color: var(--text-primary); }
.nav-item.active { background: var(--bg-accent); color: var(--brand); font-weight: 600; }
.nav-item i { font-size: 16px; width: 20px; text-align: center; }
.main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 24px; background: var(--bg-header); border-bottom: 1px solid var(--border, #e5e5e5);
  backdrop-filter: blur(8px);
}
.role-badge {
  font-size: 12px; padding: 2px 10px; border-radius: 12px;
  background: var(--bg-accent); color: var(--brand);
}
.user-info { font-size: 13px; color: var(--text-secondary); }
.content { flex: 1; padding: 24px; overflow-y: auto; }

@media print {
  .sidebar, .topbar { display: none; }
  .main { display: block; }
  .content { padding: 0; overflow: visible; }
}
</style>
