<!--
  AdminShell — 通用管理后台布局 Shell
  适用：平台总后台 | 网关中台 | 运营后台 | 财务后台 | 代理端
  特性：可折叠侧边栏/移动端抽屉/面包屑/顶栏/主题切换/暗黑模式
-->
<template>
  <div class="ash" :class="{ 'ash--dark': isDark, 'ash--collapsed': collapsed && !isMobile }">
    <!-- 移动端遮罩 -->
    <div v-if="mobileOpen" class="ash-overlay" @click="mobileOpen = false" />

    <!-- ═══ 左侧导航 ═══ -->
    <aside class="ash-side" :class="{ 'ash-side--open': mobileOpen }">
      <!-- Logo 区 -->
      <div class="ash-brand">
        <div class="ash-brand-icon" :style="{ background: accentColor }">{{ brandInitial }}</div>
        <div class="ash-brand-text">
          <div class="ash-brand-name">{{ brandName }}</div>
          <div class="ash-brand-sub">{{ brandSubtitle }}</div>
        </div>
        <button class="ash-collapse-btn" @click="collapsed = !collapsed" :title="collapsed ? '展开侧栏' : '折叠侧栏'">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3L9 7L5 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
      </div>

      <!-- 导航分组 -->
      <nav class="ash-nav">
        <template v-for="group in navGroups" :key="group.key">
          <button class="ash-nav-group" @click="toggleGroup(group.key)" :class="{ 'ash-nav-group--open': group.open }">
            <span class="ash-nav-group-icon">{{ group.icon }}</span>
            <span class="ash-nav-group-label">{{ group.label }}</span>
            <svg class="ash-nav-group-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 0.5L5 4.5L9 0.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
          <div v-show="group.open" class="ash-nav-items">
            <NuxtLink
              v-for="item in group.items"
              :key="item.key"
              :to="item.route"
              class="ash-nav-item"
              :class="{ 'ash-nav-item--active': isActive(item.route) }"
              @click="mobileOpen = false"
            >
              <span v-if="item.badge" class="ash-nav-badge">{{ item.badge }}</span>
              {{ item.label }}
            </NuxtLink>
          </div>
        </template>
      </nav>

      <!-- 侧栏底部 -->
      <div class="ash-side-footer">
        <button class="ash-theme-btn" @click="toggleTheme" :title="isDark ? '切亮色' : '切暗色'">
          {{ isDark ? '☀️' : '🌙' }}
        </button>
        <NuxtLink v-if="backRoute" :to="backRoute" class="ash-back-link">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7 2L3 6L7 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          {{ backLabel }}
        </NuxtLink>
      </div>
    </aside>

    <!-- ═══ 右侧主区域 ═══ -->
    <div class="ash-body">
      <!-- 顶栏 -->
      <header class="ash-topbar">
        <div class="ash-topbar-left">
          <button class="ash-hamburger" @click="mobileOpen = !mobileOpen" :aria-label="mobileOpen ? '关闭菜单' : '打开菜单'">
            <span /><span /><span />
          </button>
          <!-- 面包屑 -->
          <nav v-if="breadcrumbs.length" class="ash-breadcrumb" aria-label="Breadcrumb">
            <template v-for="(crumb, i) in breadcrumbs" :key="i">
              <span v-if="i > 0" class="ash-breadcrumb-sep">/</span>
              <NuxtLink v-if="crumb.route && i < breadcrumbs.length - 1" :to="crumb.route" class="ash-breadcrumb-link">{{ crumb.label }}</NuxtLink>
              <span v-else class="ash-breadcrumb-current">{{ crumb.label }}</span>
            </template>
          </nav>
        </div>
        <div class="ash-topbar-right">
          <slot name="topbar-actions" />
          <!-- 通知 -->
          <button class="ash-icon-btn" title="通知">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2a4 4 0 0 0-4 4v2l-1 2h10l-1-2V6a4 4 0 0 0-4-4z" stroke="currentColor" stroke-width="1.2"/><path d="M6 13a2 2 0 0 0 4 0" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
          </button>
          <!-- 用户 -->
          <div class="ash-user" @click="userOpen = !userOpen">
            <span class="ash-avatar" :style="{ background: accentColor }">{{ userInitial }}</span>
            <span class="ash-username">{{ userName }}</span>
          </div>
          <div v-if="userOpen" class="ash-user-dropdown" @click.stop>
            <button @click="handleLogout">退出登录</button>
          </div>
        </div>
      </header>

      <!-- 内容区 -->
      <main class="ash-content">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = withDefaults(defineProps<{
  brandName?: string
  brandSubtitle?: string
  accentColor?: string
  navGroups?: NavGroup[]
  breadcrumbs?: Breadcrumb[]
  backRoute?: string
  backLabel?: string
}>(), {
  brandName: 'Movio 管理',
  brandSubtitle: 'Admin Console',
  accentColor: '#4f5cf6',
  navGroups: () => [],
  breadcrumbs: () => [],
  backRoute: '',
  backLabel: '返回首页',
})

const emit = defineEmits<{ logout: [] }>()

type NavItem = { key: string; label: string; route: string; badge?: string }
type NavGroup = { key: string; icon: string; label: string; open: boolean; items: NavItem[] }

const route = useRoute()
const { theme, toggle: toggleTheme } = useTheme()
const isDark = computed(() => theme.value === 'dark')
const collapsed = ref(false)
const mobileOpen = ref(false)
const userOpen = ref(false)
const userName = ref('Admin')
const userInitial = computed(() => userName.value.charAt(0).toUpperCase())
const brandInitial = computed(() => props.brandName.charAt(0))
const isMobile = ref(false)

function isActive(itemRoute: string) { return route.path === itemRoute || (itemRoute !== '/' && route.path.startsWith(itemRoute)) }
function toggleGroup(key: string) {
  const g = props.navGroups.find(x => x.key === key)
  if (g) g.open = !g.open
}
function handleLogout() { userOpen.value = false; emit('logout') }

// Detect mobile
onMounted(() => {
  isMobile.value = window.innerWidth < 768
  window.addEventListener('resize', () => { isMobile.value = window.innerWidth < 768 })
})

// Close mobile sidebar on route change
watch(() => route.path, () => { mobileOpen.value = false; userOpen.value = false })

// Keyboard shortcut for sidebar
useEventListener('keydown', (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); collapsed.value = !collapsed.value }
})
</script>

<style scoped>
/* ═══ Shell ═══ */
.ash { display: flex; height: 100vh; overflow: hidden; background: var(--bg-app); font-family: var(--font-sans); }
.ash-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 90; }

/* ═══ Sidebar ═══ */
.ash-side {
  width: var(--sidebar-width); min-width: var(--sidebar-width);
  background: var(--sidebar-bg); border-right: 1px solid var(--sidebar-border);
  display: flex; flex-direction: column; flex-shrink: 0; z-index: 100;
  transition: width var(--transition-base), min-width var(--transition-base);
}
.ash--collapsed .ash-side { width: var(--sidebar-collapsed); min-width: var(--sidebar-collapsed); }
.ash--collapsed .ash-brand-text,
.ash--collapsed .ash-nav-group-label,
.ash--collapsed .ash-nav-group-chevron,
.ash--collapsed .ash-nav-items,
.ash--collapsed .ash-side-footer { display: none; }

/* ═══ Brand ═══ */
.ash-brand {
  display: flex; align-items: center; gap: var(--space-3);
  padding: var(--space-4) var(--space-3); border-bottom: 1px solid var(--sidebar-border);
  position: relative;
}
.ash-brand-icon {
  width: 34px; height: 34px; border-radius: var(--radius-md);
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 16px; font-weight: var(--font-bold); flex-shrink: 0;
}
.ash-brand-text { flex: 1; min-width: 0; }
.ash-brand-name { font-size: var(--text-base); font-weight: var(--font-semibold); color: var(--text-primary); white-space: nowrap; }
.ash-brand-sub { font-size: var(--text-xs); color: var(--text-tertiary); white-space: nowrap; }
.ash-collapse-btn {
  position: absolute; right: -10px; top: 50%; transform: translateY(-50%);
  width: 22px; height: 22px; border-radius: 50%; border: 1px solid var(--border-light);
  background: var(--bg-surface); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: var(--text-tertiary); font-size: 10px; transition: all var(--transition-fast);
}
.ash-collapse-btn:hover { border-color: var(--color-brand-400); color: var(--color-brand-600); }
.ash--collapsed .ash-collapse-btn { right: -10px; }
.ash--collapsed .ash-collapse-btn svg { transform: rotate(180deg); }

/* ═══ Nav Groups ═══ */
.ash-nav { flex: 1; overflow-y: auto; padding: var(--space-2) var(--space-2); }
.ash-nav-group {
  display: flex; align-items: center; gap: var(--space-2); width: 100%;
  padding: var(--space-2) var(--space-3); border: none; border-radius: var(--radius-md);
  background: none; color: var(--sidebar-text); font-size: var(--text-sm);
  font-weight: var(--font-medium); cursor: pointer; transition: all var(--transition-fast);
  font-family: var(--font-sans); text-align: left;
}
.ash-nav-group:hover { background: var(--sidebar-bg-hover); color: var(--text-primary); }
.ash-nav-group-icon { font-size: 15px; width: 22px; text-align: center; flex-shrink: 0; }
.ash-nav-group-label { flex: 1; white-space: nowrap; }
.ash-nav-group-chevron { color: var(--text-tertiary); flex-shrink: 0; transition: transform var(--transition-fast); }
.ash-nav-group--open .ash-nav-group-chevron { transform: rotate(180deg); }

/* ═══ Nav Items ═══ */
.ash-nav-items { padding-left: var(--space-8); margin-bottom: var(--space-1); }
.ash-nav-item {
  display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm); font-size: var(--text-sm); color: var(--text-secondary);
  text-decoration: none; transition: all var(--transition-fast); position: relative;
}
.ash-nav-item:hover { background: var(--sidebar-bg-hover); color: var(--text-primary); }
.ash-nav-item--active { background: var(--sidebar-bg-active); color: var(--sidebar-text-active); font-weight: var(--font-medium); }
.ash-nav-badge {
  position: absolute; right: var(--space-2); font-size: 10px;
  background: var(--color-danger-500); color: #fff;
  padding: 0 6px; border-radius: var(--radius-full); line-height: 17px;
}

/* ═══ Sidebar Footer ═══ */
.ash-side-footer { padding: var(--space-3); border-top: 1px solid var(--sidebar-border); display: flex; align-items: center; gap: var(--space-2); }
.ash-theme-btn {
  width: 32px; height: 32px; border: 1px solid var(--border-light); border-radius: var(--radius-sm);
  background: none; font-size: 15px; cursor: pointer; transition: all var(--transition-fast);
  display: flex; align-items: center; justify-content: center;
}
.ash-theme-btn:hover { border-color: var(--color-brand-400); }
.ash-back-link {
  font-size: var(--text-xs); color: var(--text-tertiary); text-decoration: none;
  display: flex; align-items: center; gap: var(--space-1); transition: color var(--transition-fast);
}
.ash-back-link:hover { color: var(--text-primary); }

/* ═══ Body ═══ */
.ash-body { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }

/* ═══ Topbar ═══ */
.ash-topbar {
  display: flex; align-items: center; justify-content: space-between;
  height: var(--header-height); padding: 0 var(--space-5);
  background: var(--header-bg); border-bottom: 1px solid var(--header-border);
  backdrop-filter: blur(12px); flex-shrink: 0; gap: var(--space-4);
}
.ash-topbar-left { display: flex; align-items: center; gap: var(--space-3); }
.ash-topbar-right { display: flex; align-items: center; gap: var(--space-3); margin-left: auto; }

/* Hamburger */
.ash-hamburger {
  display: none; flex-direction: column; justify-content: center; gap: 4px;
  width: 36px; height: 36px; border: 1px solid var(--border-light); border-radius: var(--radius-sm);
  background: none; cursor: pointer; padding: 8px;
}
.ash-hamburger span { display: block; width: 16px; height: 2px; background: var(--text-secondary); border-radius: 1px; }

/* Breadcrumb */
.ash-breadcrumb { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-xs); }
.ash-breadcrumb-sep { color: var(--text-tertiary); }
.ash-breadcrumb-link { color: var(--text-tertiary); text-decoration: none; }
.ash-breadcrumb-link:hover { color: var(--text-primary); }
.ash-breadcrumb-current { color: var(--text-primary); font-weight: var(--font-medium); }

/* Icon button */
.ash-icon-btn {
  width: 36px; height: 36px; border: 1px solid var(--border-light); border-radius: var(--radius-sm);
  background: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
  color: var(--text-secondary); transition: all var(--transition-fast);
}
.ash-icon-btn:hover { border-color: var(--color-brand-400); color: var(--text-primary); }

/* User */
.ash-user { display: flex; align-items: center; gap: var(--space-2); cursor: pointer; padding: var(--space-1) var(--space-2); border-radius: var(--radius-md); transition: background var(--transition-fast); }
.ash-user:hover { background: var(--bg-surface-hover); }
.ash-avatar { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 12px; font-weight: var(--font-semibold); }
.ash-username { font-size: var(--text-sm); color: var(--text-primary); }

/* User dropdown */
.ash-user-dropdown {
  position: absolute; top: calc(var(--header-height) - 4px); right: var(--space-4);
  background: var(--bg-surface); border: 1px solid var(--border-light);
  border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); min-width: 160px;
  padding: var(--space-1); z-index: var(--z-dropdown); animation: fadeInScale var(--transition-base) ease-out;
}
.ash-user-dropdown button {
  display: block; width: 100%; padding: var(--space-2) var(--space-3); border: none; border-radius: var(--radius-sm);
  background: none; color: var(--text-primary); font-size: var(--text-sm); cursor: pointer;
  text-align: left; font-family: var(--font-sans); transition: background var(--transition-fast);
}
.ash-user-dropdown button:hover { background: var(--color-danger-50); color: var(--color-danger-500); }

/* ═══ Content ═══ */
.ash-content { flex: 1; overflow-y: auto; padding: var(--space-6) var(--space-8); }

/* ═══ RESPONSIVE ═══ */
@media (max-width: 1023px) {
  .ash-side { width: 200px; min-width: 200px; }
  .ash-content { padding: var(--space-4) var(--space-5); }
}

@media (max-width: 767px) {
  .ash-hamburger { display: flex; }
  .ash-side {
    position: fixed; left: 0; top: 0; bottom: 0; z-index: 100;
    transform: translateX(-100%); transition: transform 0.25s ease-out;
    width: 260px !important; min-width: 260px !important;
  }
  .ash-side--open { transform: translateX(0); }
  .ash-overlay { display: block; }
  .ash-collapse-btn { display: none; }
  .ash--collapsed .ash-brand-text,
  .ash--collapsed .ash-nav-group-label,
  .ash--collapsed .ash-nav-group-chevron,
  .ash--collapsed .ash-nav-items,
  .ash--collapsed .ash-side-footer { display: block; }
  .ash-breadcrumb { display: none; }
  .ash-content { padding: var(--space-4) var(--space-3); }
  .ash-username { display: none; }
  .ash-topbar { padding: 0 var(--space-3); }
}
</style>
