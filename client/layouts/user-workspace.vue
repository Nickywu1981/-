<template>
  <div class="user-workspace-layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <h1 class="logo">{{ t('workspace_nav.brand_name') }}</h1>
        <span class="badge">{{ t('workspace_nav.badge') }}</span>
      </div>

      <!-- 普通用户菜单 -->
      <nav v-if="activeRole === 'user'" class="nav">
        <div class="nav-group">
          <p class="nav-label">{{ t('workspace_nav.section_ai_create') }}</p>
          <NuxtLink to="/work/image" class="nav-item" active-class="active">
            <i class="icon-image"></i> {{ t('workspace_nav.image_gen') }}
          </NuxtLink>
          <NuxtLink to="/work/video" class="nav-item" active-class="active">
            <i class="icon-video"></i> {{ t('workspace_nav.video_gen') }}
          </NuxtLink>
          <NuxtLink to="/work/my-templates" class="nav-item" active-class="active">
            <i class="icon-layout"></i> {{ t('workspace_nav.templates') }}
          </NuxtLink>
          <NuxtLink to="/work/diy-pages" class="nav-item" active-class="active">
            <i class="icon-grid"></i> {{ t('workspace_nav.diy_editor') }}
          </NuxtLink>
        </div>
        <div class="nav-group">
          <p class="nav-label">{{ t('workspace_nav.section_my') }}</p>
          <NuxtLink to="/work/output" class="nav-item" active-class="active">
            <i class="icon-folder"></i> {{ t('workspace_nav.projects') }}
          </NuxtLink>
          <NuxtLink to="/assets" class="nav-item" active-class="active">
            <i class="icon-hard-drive"></i> {{ t('workspace_nav.assets') }}
          </NuxtLink>
          <NuxtLink to="/work/usage" class="nav-item" active-class="active">
            <i class="icon-settings"></i> {{ t('workspace_nav.account_settings') }}
          </NuxtLink>
        </div>
      </nav>

      <!-- 代理菜单 -->
      <nav v-if="activeRole === 'agent'" class="nav">
        <div class="nav-group">
          <p class="nav-label">{{ t('workspace_nav.section_ai_create') }}</p>
          <NuxtLink to="/work/image" class="nav-item" active-class="active">
            <i class="icon-image"></i> {{ t('workspace_nav.image_gen') }}
          </NuxtLink>
          <NuxtLink to="/work/video" class="nav-item" active-class="active">
            <i class="icon-video"></i> {{ t('workspace_nav.video_gen') }}
          </NuxtLink>
          <NuxtLink to="/work/my-templates" class="nav-item" active-class="active">
            <i class="icon-layout"></i> {{ t('workspace_nav.templates') }}
          </NuxtLink>
        </div>
        <div class="nav-group">
          <p class="nav-label">{{ t('workspace_nav.section_agent_manage') }}</p>
          <NuxtLink to="/agent/team" class="nav-item" active-class="active">
            <i class="icon-users"></i> {{ t('workspace_nav.sub_agent_manage') }}
          </NuxtLink>
          <NuxtLink to="/agent/commission" class="nav-item" active-class="active">
            <i class="icon-dollar-sign"></i> {{ t('workspace_nav.commission_board') }}
          </NuxtLink>
          <NuxtLink to="/agent/withdraw" class="nav-item" active-class="active">
            <i class="icon-credit-card"></i> {{ t('workspace_nav.withdraw') }}
          </NuxtLink>
          <NuxtLink to="/agent/distribution" class="nav-item" active-class="active">
            <i class="icon-share"></i> {{ t('workspace_nav.promo_link') }}
          </NuxtLink>
        </div>
        <div class="nav-group">
          <p class="nav-label">{{ t('workspace_nav.section_my') }}</p>
          <NuxtLink to="/work/output" class="nav-item" active-class="active">
            <i class="icon-folder"></i> {{ t('workspace_nav.projects') }}
          </NuxtLink>
          <NuxtLink to="/agent/dashboard" class="nav-item" active-class="active">
            <i class="icon-settings"></i> {{ t('workspace_nav.settings') }}
          </NuxtLink>
        </div>
      </nav>

      <!-- 企业菜单 -->
      <nav v-if="activeRole === 'enterprise'" class="nav">
        <div class="nav-group">
          <p class="nav-label">{{ t('workspace_nav.section_ai_create') }}</p>
          <NuxtLink to="/work/image" class="nav-item" active-class="active">
            <i class="icon-image"></i> {{ t('workspace_nav.image_gen') }}
          </NuxtLink>
          <NuxtLink to="/work/video" class="nav-item" active-class="active">
            <i class="icon-video"></i> {{ t('workspace_nav.video_gen') }}
          </NuxtLink>
          <NuxtLink to="/work/my-templates" class="nav-item" active-class="active">
            <i class="icon-layout"></i> {{ t('workspace_nav.templates') }}
          </NuxtLink>
        </div>
        <div class="nav-group">
          <p class="nav-label">{{ t('workspace_nav.section_enterprise_space') }}</p>
          <NuxtLink to="/enterprise/dashboard" class="nav-item" active-class="active">
            <i class="icon-grid"></i> {{ t('workspace_nav.collab_workspace') }}
          </NuxtLink>
          <NuxtLink to="/enterprise/users" class="nav-item" active-class="active">
            <i class="icon-users"></i> {{ t('workspace_nav.member_manage') }}
          </NuxtLink>
          <NuxtLink to="/enterprise/whitelabel" class="nav-item" active-class="active">
            <i class="icon-bookmark"></i> {{ t('workspace_nav.brand_assets') }}
          </NuxtLink>
          <NuxtLink to="/enterprise/usage" class="nav-item" active-class="active">
            <i class="icon-activity"></i> {{ t('workspace_nav.usage_board') }}
          </NuxtLink>
        </div>
        <div class="nav-group">
          <p class="nav-label">{{ t('workspace_nav.section_my') }}</p>
          <NuxtLink to="/work/output" class="nav-item" active-class="active">
            <i class="icon-folder"></i> {{ t('workspace_nav.projects') }}
          </NuxtLink>
          <NuxtLink to="/enterprise/settings" class="nav-item" active-class="active">
            <i class="icon-settings"></i> {{ t('workspace_nav.settings') }}
          </NuxtLink>
        </div>
      </nav>
    </aside>

    <main class="main">
      <header class="topbar">
        <!-- 角色切换下拉 -->
        <div v-if="showRoleSwitcher" class="role-switcher">
          <button class="role-btn" :class="{ active: activeRole === 'user' }" @click="switchRole('user')">
            👤 {{ t('workspace_nav.role_personal') }}
          </button>
          <button v-if="hasAgentRole" class="role-btn" :class="{ active: activeRole === 'agent' }" @click="switchRole('agent')">
            🤝 {{ t('workspace_nav.role_agent') }}
          </button>
          <button v-if="hasEnterpriseRole" class="role-btn" :class="{ active: activeRole === 'enterprise' }" @click="switchRole('enterprise')">
            🏢 {{ t('workspace_nav.role_enterprise') }}
          </button>
        </div>
        <span class="user-info">{{ user?.nickname || user?.username }}</span>
      </header>
      <div class="content">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/useAuthStore'

const { t } = useI18n()
const auth = useAuthStore()
const user = computed(() => auth.user)

const activeRole = ref(user.value?.role || 'user')

const hasAgentRole = computed(() => user.value?.role === 'agent')
const hasEnterpriseRole = computed(() => user.value?.role === 'enterprise')
const showRoleSwitcher = computed(() => hasAgentRole.value || hasEnterpriseRole.value)

function switchRole(role: string) {
  activeRole.value = role
  navigateTo('/work')
}
</script>

<style scoped>
.user-workspace-layout {
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
.role-switcher { display: flex; gap: 6px; }
.role-btn {
  padding: 4px 12px; border: 1px solid var(--border, #e5e5e5); border-radius: 16px;
  background: var(--bg-card); font-size: 12px; cursor: pointer;
  color: var(--text-secondary); transition: all .15s;
}
.role-btn:hover { border-color: var(--brand); color: var(--brand); }
.role-btn.active { background: var(--brand); color: #fff; border-color: var(--brand); }
.user-info { font-size: 13px; color: var(--text-secondary); }
.content { flex: 1; padding: 24px; overflow-y: auto; }

@media print {
  .sidebar, .topbar { display: none; }
  .main { display: block; }
  .content { padding: 0; overflow: visible; }
}
</style>
