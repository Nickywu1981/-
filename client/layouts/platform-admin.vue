<template>
  <div class="platform-admin-layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <h1 class="logo">{{ t('platform_admin_nav.brand_name') }}</h1>
        <span class="badge">{{ t('platform_admin_nav.badge') }}</span>
      </div>
      <nav class="nav">
        <div class="nav-group">
          <p class="nav-label">{{ t('platform_admin_nav.section_system_control') }}</p>
          <NuxtLink to="/admin/dashboard" class="nav-item" active-class="active">
            <i class="icon-dashboard"></i> {{ t('platform_admin_nav.overview_dashboard') }}
          </NuxtLink>
          <NuxtLink to="/admin/users" class="nav-item" active-class="active">
            <i class="icon-users"></i> {{ t('platform_admin_nav.tenant_manage') }}
          </NuxtLink>
          <NuxtLink to="/admin/tenants" class="nav-item" active-class="active">
            <i class="icon-building"></i> {{ t('platform_admin_nav.tenant_switch') }}
          </NuxtLink>
        </div>
        <div class="nav-group">
          <p class="nav-label">{{ t('platform_admin_nav.section_gateway') }}</p>
          <NuxtLink to="/gateway/dashboard" class="nav-item" active-class="active">
            <i class="icon-cpu"></i> {{ t('platform_admin_nav.model_provider') }}
          </NuxtLink>
          <NuxtLink to="/gateway/routes" class="nav-item" active-class="active">
            <i class="icon-shuffle"></i> {{ t('platform_admin_nav.dispatch_strategy') }}
          </NuxtLink>
          <!-- 预留 /gateway/hooks Hook注册页待开发 -->
        </div>
        <div class="nav-group">
          <p class="nav-label">{{ t('platform_admin_nav.section_security_audit') }}</p>
          <NuxtLink to="/admin/settings" class="nav-item" active-class="active">
            <i class="icon-shield"></i> {{ t('platform_admin_nav.waf_secrets') }}
          </NuxtLink>
          <NuxtLink to="/admin/logs" class="nav-item" active-class="active">
            <i class="icon-file-text"></i> {{ t('platform_admin_nav.audit_log') }}
          </NuxtLink>
        </div>
      </nav>
    </aside>
    <main class="main">
      <header class="topbar">
        <span class="env-badge">🔒 {{ t('platform_admin_nav.env_intranet') }}</span>
        <span class="user-info">{{ user?.username || t('platform_admin_nav.super_admin_fallback') }}</span>
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

const { t } = useI18n()
const auth = useAuthStore()
const user = computed(() => auth.user)
</script>

<style scoped>
.platform-admin-layout {
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
.env-badge { font-size: 12px; color: var(--text-muted); }
.user-info { font-size: 13px; color: var(--text-secondary); }
.content { flex: 1; padding: 24px; overflow-y: auto; }

@media print {
  .sidebar, .topbar { display: none; }
  .main { display: block; }
  .content { padding: 0; overflow: visible; }
}
</style>
