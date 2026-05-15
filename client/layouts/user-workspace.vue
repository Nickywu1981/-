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
        <!-- 左侧：角色切换 -->
        <div class="topbar-left">
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
        </div>

        <!-- 右侧：功能区 -->
        <div class="topbar-right">
          <!-- 购买会员 -->
          <button class="tb-btn tb-btn-primary" @click="navigateTo('/member')">
            💎 购买会员
          </button>

          <!-- 免费领积分 -->
          <button class="tb-btn tb-btn-accent" @click="navigateTo('/invite')">
            🎁 免费领积分
          </button>

          <span class="tb-divider" />

          <!-- 在线客服 -->
          <button class="tb-btn-icon" title="在线客服" @click="showCsModal = true">
            💬
          </button>

          <!-- 帮助 -->
          <button class="tb-btn-icon" title="帮助" @click="navigateTo('/help')">
            ❓
          </button>

          <!-- 通知 -->
          <button class="tb-btn-icon tb-notify" title="通知" @click="navigateTo('/notifications')">
            🔔
            <span v-if="unreadCount > 0" class="tb-notify-dot">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
          </button>

          <span class="tb-divider" />

          <!-- 管理后台 (仅管理员) -->
          <button v-if="isAdmin" class="tb-btn tb-btn-outline" @click="navigateTo('/admin')">
            ⚙ 管理后台
          </button>

          <span v-if="isAdmin" class="tb-divider" />

          <!-- 头像下拉 -->
          <div class="tb-user-menu" @click.stop="toggleUserMenu">
            <div class="tb-avatar">
              <img v-if="user?.avatar" :src="user.avatar" class="tb-avatar-img" alt="" />
              <span v-else class="tb-avatar-text">{{ (user?.nickname || user?.username || 'U')[0].toUpperCase() }}</span>
            </div>
            <span class="tb-username">{{ user?.nickname || user?.username }}</span>
            <span class="tb-chevron">▾</span>

            <!-- 下拉菜单 -->
            <Transition name="tb-drop">
              <div v-if="showUserMenu" class="tb-dropdown">
                <button class="tb-drop-item" @click.stop="navigateTo('/profile')">👤 个人中心</button>
                <button class="tb-drop-item" @click.stop="navigateTo('/member')">💎 我的会员</button>
                <button class="tb-drop-item" @click.stop="navigateTo('/credits')">🪙 我的积分</button>
                <button class="tb-drop-item" @click.stop="navigateTo('/settings')">⚙ 账号设置</button>
                <div class="tb-drop-sep" />
                <button class="tb-drop-item tb-drop-danger" @click.stop="handleLogout">🚪 退出登录</button>
              </div>
            </Transition>
          </div>
        </div>
      </header>
      <div class="content">
        <slot />
      </div>
    </main>

    <!-- 在线客服弹窗 -->
    <Transition name="cs-modal">
      <div v-if="showCsModal" class="cs-overlay" @click.self="showCsModal = false">
        <div class="cs-dialog" role="dialog" aria-modal="true" :aria-label="t('cs.title')">
          <div class="cs-hd">
            <h3>{{ t('cs.title') }}</h3>
            <button class="cs-close" :aria-label="t('common.close')" @click="showCsModal = false">✕</button>
          </div>
          <div class="cs-bd">
            <p class="cs-desc">{{ t('cs.desc') }}</p>
            <div class="cs-qr-placeholder">
              <span class="cs-qr-icon">💬</span>
              <p>{{ t('cs.qr_placeholder') }}</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/useAuthStore'

const { t } = useI18n()
const auth = useAuthStore()
const user = computed(() => auth.user)

const activeRole = ref(user.value?.role || 'user')
const showUserMenu = ref(false)
const showCsModal = ref(false)
const unreadCount = ref(0)

const hasAgentRole = computed(() => user.value?.role === 'agent')
const hasEnterpriseRole = computed(() => user.value?.role === 'enterprise')
const showRoleSwitcher = computed(() => hasAgentRole.value || hasEnterpriseRole.value)
const isAdmin = computed(() => (user.value as any)?.isAdmin === true || user.value?.role === 'admin')

function switchRole(role: string) {
  activeRole.value = role
  navigateTo('/work')
}

function toggleUserMenu() {
  showUserMenu.value = !showUserMenu.value
}

function handleLogout() {
  showUserMenu.value = false
  auth.logout()
}

// 关闭下拉菜单的全局点击监听（通过 watch 控制）
watch(showUserMenu, (v) => {
  if (v) document.addEventListener('click', closeUserMenu)
  else document.removeEventListener('click', closeUserMenu)
})
function closeUserMenu(e: Event) {
  showUserMenu.value = false
}
onUnmounted(() => document.removeEventListener('click', closeUserMenu))
</script>

<style scoped>
/* ═══ Layout ═══ */
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

/* ═══ Topbar ═══ */
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 24px; background: var(--bg-header, rgba(255,255,255,.85));
  border-bottom: 1px solid var(--border, #e5e5e5); backdrop-filter: blur(8px);
  gap: 12px;
}
.topbar-left { display: flex; align-items: center; flex-shrink: 0; }
.topbar-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

/* Role switcher */
.role-switcher { display: flex; gap: 6px; }
.role-btn {
  padding: 4px 12px; border: 1px solid var(--border, #e5e5e5); border-radius: 16px;
  background: var(--bg-card); font-size: 12px; cursor: pointer;
  color: var(--text-secondary); transition: all .15s; font-family: inherit;
}
.role-btn:hover { border-color: var(--brand); color: var(--brand); }
.role-btn.active { background: var(--brand); color: #fff; border-color: var(--brand); }

/* ═══ Topbar buttons ═══ */
.tb-btn {
  display: inline-flex; align-items: center; gap: 5px; padding: 6px 14px;
  border-radius: 8px; font-size: 12.5px; font-weight: 500; cursor: pointer;
  border: 1px solid transparent; transition: all .15s; font-family: inherit;
  white-space: nowrap; line-height: 1.4;
}
.tb-btn-primary {
  background: #5b5fe3; color: #fff; font-weight: 600; border-color: #5b5fe3;
}
.tb-btn-primary:hover {
  background: #4a4ed6; transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(91,95,227,.3);
}
.tb-btn-accent {
  background: linear-gradient(135deg, #f97316, #f59e0b); color: #fff; font-weight: 600;
}
.tb-btn-accent:hover {
  transform: translateY(-1px); box-shadow: 0 4px 12px rgba(249,115,22,.3);
}
.tb-btn-outline {
  background: transparent; border-color: #5b5fe3; color: #5b5fe3; font-size: 11.5px;
}
.tb-btn-outline:hover { background: rgba(91,95,227,.08); }

.tb-btn-icon {
  width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center;
  justify-content: center; font-size: 15px; cursor: pointer; border: none;
  background: transparent; color: #6b6b70; transition: all .15s; position: relative;
}
.tb-btn-icon:hover { background: #f5f5f5; color: #171717; }

.tb-notify { position: relative; }
.tb-notify-dot {
  position: absolute; top: -2px; right: -4px; min-width: 16px; height: 16px;
  border-radius: 10px; background: #ef4444; color: #fff; font-size: 9px;
  font-weight: 700; display: flex; align-items: center; justify-content: center;
  padding: 0 4px; border: 2px solid #fff; line-height: 1;
}

.tb-divider { width: 1px; height: 20px; background: #e5e5e5; margin: 0 2px; }

/* ═══ User menu ═══ */
.tb-user-menu {
  display: flex; align-items: center; gap: 8px; cursor: pointer;
  padding: 4px 10px 4px 4px; border-radius: 24px; border: 1px solid transparent;
  transition: all .15s; position: relative; user-select: none;
}
.tb-user-menu:hover { border-color: #e5e5e5; background: #fafafa; }

.tb-avatar {
  width: 32px; height: 32px; border-radius: 50%; overflow: hidden;
  background: linear-gradient(135deg, #5b5fe3, #a5a9f0); flex-shrink: 0;
}
.tb-avatar-img { width: 100%; height: 100%; object-fit: cover; }
.tb-avatar-text {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 13px; font-weight: 600;
}
.tb-username { font-size: 13px; font-weight: 500; color: var(--text-primary, #171717); }
.tb-chevron { font-size: 10px; color: #9d9da3; transition: transform .15s; }

/* ═══ Dropdown ═══ */
.tb-dropdown {
  position: absolute; top: calc(100% + 6px); right: 0; min-width: 180px;
  background: #fff; border: 1px solid #e5e5e5; border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0,0,0,.1); padding: 6px; z-index: 1000;
}
.tb-drop-item {
  display: flex; align-items: center; gap: 8px; width: 100%; padding: 9px 12px;
  border: none; border-radius: 7px; background: none; font-size: 13px; color: #171717;
  cursor: pointer; transition: background .1s; font-family: inherit; text-align: left;
}
.tb-drop-item:hover { background: #f5f5f5; }
.tb-drop-danger { color: #c62828; }
.tb-drop-danger:hover { background: #fce4ec; }
.tb-drop-sep { height: 1px; background: #ebebea; margin: 4px 8px; }

/* Dropdown transition */
.tb-drop-enter-active, .tb-drop-leave-active { transition: all .15s ease; }
.tb-drop-enter-from, .tb-drop-leave-to { opacity: 0; transform: translateY(-4px); }

/* ═══ CS Modal ═══ */
.cs-overlay {
  position: fixed; inset: 0; z-index: 4000; background: rgba(0,0,0,.4);
  display: flex; align-items: center; justify-content: center;
}
.cs-dialog {
  background: var(--bg-page); border-radius: 12px; width: 400px; max-width: 90vw;
  box-shadow: 0 16px 48px rgba(0,0,0,.15); overflow: hidden;
}
.cs-hd {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid var(--border, #e5e5e5);
}
.cs-hd h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--text-primary); }
.cs-close {
  width: 28px; height: 28px; border: none; border-radius: 6px; background: none;
  font-size: 16px; cursor: pointer; color: var(--text-secondary);
}
.cs-close:hover { background: var(--bg-hover); }
.cs-bd { padding: 24px 20px; text-align: center; }
.cs-desc { font-size: 14px; color: var(--text-secondary); margin: 0 0 20px; }
.cs-qr-placeholder {
  padding: 40px 20px; border: 2px dashed var(--border, #e5e5e5); border-radius: 8px;
}
.cs-qr-icon { font-size: 40px; display: block; margin-bottom: 8px; }
.cs-qr-placeholder p { font-size: 13px; color: var(--text-muted); margin: 0; }
.cs-modal-enter-active, .cs-modal-leave-active { transition: opacity .2s; }
.cs-modal-enter-from, .cs-modal-leave-to { opacity: 0; }
.cs-modal-enter-active .cs-dialog { transition: transform .2s; }
.cs-modal-enter-from .cs-dialog { transform: scale(.95); }

.content { flex: 1; padding: 24px; overflow-y: auto; }

@media print {
  .sidebar, .topbar { display: none; }
  .main { display: block; }
  .content { padding: 0; overflow: visible; }
}
</style>
