<!--
  Movio AI v6.0 — Workspace Layout
  五大固定导航：首页 | 创作 | AI助手 | 工作流 | 龙虾
  硬性规则：不准增删改顶级菜单，子功能全放在对应分类内
-->
<template>
  <div class="wsl">
    <!-- 移动端遮罩 -->
    <div v-if="mobileOpen" class="wsl-overlay" @click="mobileOpen = false" />

    <!-- ═══ 左侧导航 ═══ -->
    <aside class="wsl-side" :class="{ fold: folded, 'mobile-open': mobileOpen }">
      <div class="wsl-logo-area">
        <NuxtLink to="/workspace" class="wsl-logo">
          <span class="wsl-logo-mark">M</span>
          <span v-if="!folded" class="wsl-logo-text">Movio AI</span>
        </NuxtLink>
        <button class="wsl-fold-btn" @click="handleFoldBtnClick" :title="folded ? t('workspace.fold_expand') : t('workspace.fold_collapse')" :aria-label="folded ? t('workspace.fold_expand') : t('workspace.fold_collapse')">
          {{ folded ? '▶' : '◀' }}
        </button>
      </div>

      <nav class="wsl-nav" role="navigation" :aria-label="t('workspace.nav_main_label')">
        <NuxtLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.disabled ? '#' : item.path"
          class="wsl-nav-item"
          :class="{ sel: !item.disabled && isActive(item), off: item.disabled }"
          @click="if (item.disabled) { $event.preventDefault() } else { mobileOpen = false }"
        >
          <span class="wsl-nav-icon">{{ item.icon }}</span>
          <span v-if="!folded" class="wsl-nav-label">{{ item.label }}</span>
          <span v-if="!folded && item.disabled" class="wsl-nav-tag">{{ $t('workspace.coming_soon_tag') }}</span>
        </NuxtLink>
      </nav>

      <div class="wsl-footer">
        <div class="wsl-user">
          <span class="wsl-av">{{ userInitial }}</span>
          <span v-if="!folded" class="wsl-uname">{{ userName }}</span>
        </div>
        <div v-if="!folded" class="wsl-points">{{ $t('workspace.points_label') }}: {{ userPoints }}</div>
      </div>
    </aside>

    <!-- ═══ 右侧主区域 ═══ -->
    <div class="wsl-main">
      <a href="#main-content" class="wsl-skip">{{ $t('landing.skip_to_content') }}</a>
      <header class="wsl-top">
        <button class="wsl-hamburger" @click="mobileOpen = !mobileOpen" :aria-label="mobileOpen ? t('workspace.menu_close_label') : t('workspace.menu_open_label')" :aria-expanded="mobileOpen">
          <span /><span /><span />
        </button>
        <h2 class="wsl-title">{{ pageTitle }}</h2>
        <div class="wsl-actions">
          <NuxtLink v-if="isAdmin" to="/admin" class="wsl-btn">{{ $t('workspace.admin_panel') }}</NuxtLink>
          <button class="wsl-btn" @click="handleLogout">{{ $t('workspace.exit_login') }}</button>
        </div>
      </header>
      <main id="main-content" class="wsl-content" tabindex="-1">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const toast = useToast()
const { confirm } = useConfirm()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const folded = ref(false)
const mobileOpen = ref(false)
const userInitial = ref('U')
const userName = ref('')
const userPoints = ref(0)
const isAdmin = ref(false)

function handleFoldBtnClick() {
  if (window.innerWidth <= 768) {
    mobileOpen.value = false
    return
  }
  folded.value = !folded.value
}

const currentPath = computed(() => route.path)

// ═══════════════════════════════════════════════
// 五大固定顶级导航 — 优先读 site_config，fallback 硬编码
// ═══════════════════════════════════════════════
const defaultNavItems = [
  { path: '/workspace',            icon: '🏠', label: t('workspace.nav_home'),    disabled: false },
  { path: '/workspace/creation',   icon: '🎨', label: t('workspace.nav_creation'),    disabled: false },
  { path: '/workspace/assistant',  icon: '🤖', label: t('workspace.nav_assistant'), disabled: false },
  { path: '/workspace/workflow',   icon: '⚙', label: t('workspace.nav_workflow'),  disabled: false },
  { path: '/workspace/lobster',    icon: '🏭', label: t('workspace.nav_lobster'),    disabled: false },
]

const navItems = ref<{ path: string; icon: string; label: string; disabled: boolean }[]>(defaultNavItems)

function isActive(item: { path: string }) {
  if (item.path === '/workspace') return currentPath.value === '/workspace'
  return currentPath.value.startsWith(item.path)
}

const pageTitle = computed(() => {
  const item = navItems.value.find(i => !i.disabled && isActive(i))
  return item ? item.label : t('workspace.default_page_title')
})

async function handleLogout() {
  if (!await confirm({ message: t('workspace.logout_confirm'), variant: 'warning' })) return;
  try {
    await $fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    toast.success(t('workspace.logout_success'))
    router.push('/login')
  } catch {
    toast.error(t('workspace.logout_fail'))
  }
}

onMounted(async () => {
  try {
    const data = await $fetch('/api/auth/me', { credentials: 'include' })
    userName.value = (data as any).username || (data as any).email || ''
    userPoints.value = (data as any).points || 0
    isAdmin.value = !!(data as any).isAdmin
    userInitial.value = userName.value ? userName.value.charAt(0).toUpperCase() : 'U'
  } catch (e: any) {
    if (e?.status === 401 || e?.statusCode === 401) router.push('/login')
  }

  try {
    const cfg: any = await $fetch('/api/site-config/public')
    if (cfg?.workspace_nav && Array.isArray(cfg.workspace_nav) && cfg.workspace_nav.length > 0) {
      navItems.value = cfg.workspace_nav
    }
  } catch { /* fallback to defaultNavItems */ }
})

definePageMeta({ middleware: ['auth'] })
</script>

<style scoped>
/* ═══ Layout Shell ═══ */
.wsl { display: flex; height: 100vh; overflow: hidden; background: var(--bg-page, #fafaf9); }

/* ═══ Sidebar ═══ */
.wsl-side {
  width: 200px; background: #fff; border-right: 1px solid var(--brd, #ebebea);
  display: flex; flex-direction: column; flex-shrink: 0; transition: width 0.2s;
}
.wsl-side.fold { width: 56px; }
.wsl-logo-area {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 12px 10px;
}
.wsl-logo { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 500; color: var(--tx, #171717); text-decoration: none; letter-spacing: -0.03em; white-space: nowrap; }
.wsl-logo-mark { width: 26px; height: 26px; background: #5b5fe3; color: #fff; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; flex-shrink: 0; }
.wsl-logo-text { }
.wsl-fold-btn {
  min-width: 32px; min-height: 32px; border: none; background: none; cursor: pointer;
  color: var(--tx2, #6b6b70); font-size: 13px; border-radius: 6px; display: flex; align-items: center; justify-content: center;
}
.wsl-fold-btn:hover { background: var(--bg-hover, #f5f5f5); }
.wsl-fold-btn:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }

/* Nav */
.wsl-nav { flex: 1; display: flex; flex-direction: column; gap: 1px; padding: 4px 8px; overflow-y: auto; }
.wsl-nav-item {
  display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 8px;
  color: var(--tx2, #6b6b70); font-size: 13px; text-decoration: none; transition: background 0.15s, color 0.15s; white-space: nowrap;
}
.wsl-nav-item:hover { background: var(--bg-hover, #f5f5f5); color: var(--tx, #171717); }
.wsl-nav-item:focus-visible { outline: 2px solid var(--brand); outline-offset: -2px; border-radius: 8px; }
.wsl-nav-item.sel { background: var(--brand, #5b5fe3); color: #fff; box-shadow: 0 1px 3px rgba(91,95,227,0.2); }
.wsl-nav-item.off { opacity: 0.45; cursor: default; }
.wsl-nav-item.off:hover { background: none; color: var(--tx2, #6b6b70); }
.wsl-nav-icon { font-size: 16px; width: 22px; text-align: center; flex-shrink: 0; }
.wsl-nav-label { flex: 1; }
.wsl-nav-tag { font-size: 10px; padding: 1px 6px; border-radius: 4px; background: rgba(91,95,227,0.08); color: #5b5fe3; }

/* Footer */
.wsl-footer { padding: 10px 12px; border-top: 1px solid var(--brd, #ebebea); }
.wsl-user { display: flex; align-items: center; gap: 8px; }
.wsl-av { width: 28px; height: 28px; border-radius: 50%; background: var(--bg-av, #e8e8ec); display: flex; align-items: center; justify-content: center; font-size: 12px; color: var(--tx2, #6b6b70); flex-shrink: 0; }
.wsl-uname { font-size: 13px; color: var(--tx, #171717); }
.wsl-points { font-size: 11px; color: var(--tx3, #9d9da3); margin-top: 4px; padding-left: 36px; }

/* ═══ Main Area ═══ */
.wsl-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.wsl-top {
  display: flex; align-items: center; gap: 12px; padding: 12px 24px; background: rgba(255,255,255,0.7);
  backdrop-filter: blur(10px); border-bottom: 1px solid var(--brd, #ebebea); flex-shrink: 0;
}
.wsl-title { font-size: 15px; font-weight: 500; color: var(--tx, #171717); letter-spacing: -0.03em; flex: 1; }
.wsl-actions { display: flex; gap: 8px; align-items: center; }
.wsl-btn {
  padding: 6px 14px; border-radius: 7px; font-size: 12px; color: var(--tx2, #6b6b70);
  background: none; border: 1px solid var(--brd, #ebebea); cursor: pointer; text-decoration: none; transition: background 0.15s, color 0.15s;
}
.wsl-btn:hover { background: var(--bg-hover, #f5f5f5); color: var(--tx, #171717); }
.wsl-btn:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
.wsl-content { flex: 1; overflow-y: auto; scroll-margin-top: 56px; }

/* Skip link */
.wsl-skip { position: absolute; top: -100px; left: 16px; z-index: 200; padding: 10px 20px; background: #5b5fe3; color: #fff; border-radius: 8px; font-size: 14px; font-weight: 500; text-decoration: none; }
.wsl-skip:focus { top: 8px; }

/* Hamburger */
.wsl-hamburger {
  display: none; flex-direction: column; justify-content: center; gap: 4px;
  min-width: 36px; min-height: 36px; border: none; background: none; cursor: pointer;
  padding: 6px; border-radius: 6px;
}
.wsl-hamburger span { display: block; width: 18px; height: 2px; background: var(--tx, #171717); border-radius: 1px; }
.wsl-hamburger:hover { background: var(--bg-hover, #f5f5f5); }
.wsl-hamburger:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }

/* Overlay */
.wsl-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 90; }

/* Dark */
:root[data-theme="dark"] .wsl-side, :root.dark .wsl-side { background: #121212; border-color: #2a2a2a; }
:root[data-theme="dark"] .wsl-top, :root.dark .wsl-top { background: rgba(18,18,18,0.8); border-color: #2a2a2a; }

/* ═══ Mobile (≤768px) ═══ */
@media (max-width: 768px) {
  .wsl-hamburger { display: flex; }
  .wsl-side {
    position: fixed; left: 0; top: 0; bottom: 0; z-index: 100;
    transform: translateX(-100%); transition: transform 0.25s;
  }
  .wsl-side.mobile-open { transform: translateX(0); }
  .wsl-overlay { display: block; }
  .wsl-side.fold { width: 200px; }
  .wsl-top { padding: 12px 16px; }
}
</style>
