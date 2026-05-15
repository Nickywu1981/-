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
