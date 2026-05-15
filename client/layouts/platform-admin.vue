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
          <NuxtLink to="/admin/settings" class="nav-item" active-class="active">
            <i class="icon-settings"></i> {{ t('platform_admin_nav.system_params') }}
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
