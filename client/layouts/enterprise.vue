<!--
  企业端布局 — 统一设计系统 v3.0
  暗色侧边栏 + 亮色主区域，与 AdminShell 保持视觉一致
-->
<template>
  <div class="ent">
    <!-- 移动端遮罩 -->
    <div v-if="mobileOpen" class="ent-overlay" @click="mobileOpen = false" />

    <!-- 左侧导航 -->
    <aside class="ent-side" :class="{ 'ent-side--open': mobileOpen }">
      <div class="ent-brand">
        <div class="ent-brand-icon">E</div>
        <div class="ent-brand-text">
          <div class="ent-brand-name">{{ entName || $t('enterprise.nav.pageTitle') }}</div>
          <div class="ent-brand-sub">{{ $t('enterprise.nav.brand_subtitle') }}</div>
        </div>
      </div>

      <nav class="ent-nav">
        <template v-for="group in navGroups" :key="group.key">
          <button class="ent-nav-group" @click="group.open = !group.open" :class="{ 'ent-nav-group--open': group.open }">
            <span class="ent-nav-group-icon">{{ group.icon }}</span>
            <span class="ent-nav-group-label">{{ group.label }}</span>
            <svg class="ent-nav-group-chevron" width="10" height="6" viewBox="0 0 10 6"><path d="M1 0.5L5 4.5L9 0.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
          <div v-show="group.open" class="ent-nav-items">
            <NuxtLink
              v-for="item in group.items"
              :key="item.key"
              :to="item.route"
              class="ent-nav-item"
              :class="{ 'ent-nav-item--active': isActive(item.route) }"
              @click="mobileOpen = false"
            >{{ item.label }}</NuxtLink>
          </div>
        </template>
      </nav>

      <div class="ent-side-footer">
        <button class="ent-theme-btn" @click="toggleTheme" :title="isDark ? t('admin_shell.switch_light') : t('admin_shell.switch_dark')">{{ isDark ? '☀️' : '🌙' }}</button>
        <button class="ent-logout" @click="handleLogout">{{ t('admin_shell.logout') }}</button>
      </div>
    </aside>

    <!-- 右侧主区域 -->
    <div class="ent-body">
      <header class="ent-topbar">
        <button class="ent-hamburger" @click="mobileOpen = !mobileOpen" :aria-label="$t('enterprise.nav.open_menu')" :aria-expanded="mobileOpen">
          <span /><span /><span />
        </button>
        <h2 class="ent-title">{{ pageTitle }}</h2>
        <div class="ent-actions">
          <slot name="topbar-actions" />
        </div>
      </header>
      <main class="ent-content">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { api } from '~/composables/useApi'

const route = useRoute()
const router = useRouter()
const { theme, toggle: toggleTheme } = useTheme()
const { t } = useI18n()
const isDark = computed(() => theme.value === 'dark')
const mobileOpen = ref(false)
const entName = ref('')

const navGroups = reactive([
  { key: 'main', icon: '📊', label: t('enterprise.nav.dataOverview'), open: true,
    items: [{ key: 'dashboard', label: t('enterprise.nav.dashboard'), route: '/enterprise/dashboard' }] },
  { key: 'users', icon: '👥', label: t('enterprise.nav.userManagement'), open: false,
    items: [
      { key: 'users', label: t('enterprise.nav.members'), route: '/enterprise/users' },
      { key: 'customers', label: t('enterprise.nav.customers'), route: '/enterprise/customers' },
      { key: 'tags', label: t('enterprise.nav.customerTags'), route: '/enterprise/customers/tags' },
    ]},
  { key: 'biz', icon: '📦', label: t('enterprise.nav.businessManagement'), open: false,
    items: [
      { key: 'channels', label: t('enterprise.nav.channels'), route: '/enterprise/channels' },
      { key: 'distribution', label: t('enterprise.nav.distribution'), route: '/enterprise/distribution' },
      { key: 'commerce', label: t('enterprise.nav.commerce'), route: '/enterprise/commerce' },
    ]},
  { key: 'finance', icon: '💵', label: t('enterprise.nav.financeManagement'), open: false,
    items: [{ key: 'finance', label: t('enterprise.nav.financeBoard'), route: '/enterprise/finance/dashboard' }] },
  { key: 'data', icon: '📈', label: t('enterprise.nav.dataAnalysis'), open: false,
    items: [
      { key: 'reports', label: t('enterprise.nav.reports'), route: '/enterprise/reports' },
      { key: 'usage', label: t('enterprise.nav.usage'), route: '/enterprise/usage' },
    ]},
  { key: 'settings', icon: '⚙️', label: t('enterprise.nav.settingsNav'), open: false,
    items: [
      { key: 'plans', label: t('enterprise.nav.plans'), route: '/enterprise/plans' },
      { key: 'whitelabel', label: t('enterprise.nav.whitelabel'), route: '/enterprise/whitelabel' },
      { key: 'settings', label: t('enterprise.nav.enterpriseSettings'), route: '/enterprise/settings' },
    ]},
])

const pageTitle = computed(() => {
  for (const g of navGroups) {
    const it = g.items.find(i => isActive(i.route))
    if (it) return it.label
  }
  return t('enterprise.nav.pageTitle')
})

function isActive(itemRoute: string) { return route.path === itemRoute || (itemRoute !== '/' && route.path.startsWith(itemRoute + '/')) }

onMounted(async () => {
  try {
    const data = await api.get('/enterprise/profile')
    entName.value = data?.data?.name || ''
  } catch (e: any) {
    if (e?.response?.status === 401) router.push('/enterprise/login')
    else { if (import.meta.dev) console.error('[enterprise] Failed to load profile', e); toast.error(t('enterprise.nav.loadProfileFailed')) }
  }
})

async function handleLogout() {
  try { await api.post('/enterprise/logout') } catch (e) { if (import.meta.dev) console.error('Logout error:', e) }
  document.cookie = 'token=; path=/; max-age=0'
  document.cookie = 'refreshToken=; path=/; max-age=0'
  router.push('/enterprise/login')
}

watch(() => route.path, () => { mobileOpen.value = false })
</script>

<style scoped>
/* ═══ Shell ═══ */
.ent { display: flex; height: 100vh; overflow: hidden; background: var(--bg-app); font-family: var(--font-sans); }
.ent-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 90; }

/* ═══ Sidebar — 深色 ═══ */
.ent-side {
  width: 240px; min-width: 240px; background: #0f121e; color: #e8eaf0;
  display: flex; flex-direction: column; flex-shrink: 0;
  z-index: 100; transition: transform 0.25s;
}
.ent-brand {
  display: flex; align-items: center; gap: var(--space-3);
  padding: var(--space-5) var(--space-4); border-bottom: 1px solid rgba(255,255,255,0.06);
}
.ent-brand-icon {
  width: 36px; height: 36px; border-radius: var(--radius-md);
  background: var(--gradient-brand); display: flex; align-items: center;
  justify-content: center; font-size: 18px; font-weight: var(--font-bold); color: #fff; flex-shrink: 0;
}
.ent-brand-text { min-width: 0; }
.ent-brand-name { font-size: 16px; font-weight: var(--font-semibold); white-space: nowrap; }
.ent-brand-sub { font-size: 11px; color: rgba(255,255,255,0.35); white-space: nowrap; }

/* ═══ Nav ═══ */
.ent-nav { flex: 1; overflow-y: auto; padding: var(--space-2); }
.ent-nav-group {
  display: flex; align-items: center; gap: var(--space-2); width: 100%;
  padding: 9px 12px; border: none; border-radius: var(--radius-md);
  background: none; color: rgba(255,255,255,0.55); font-size: 13px;
  font-weight: var(--font-medium); cursor: pointer; transition: all var(--transition-fast);
  font-family: var(--font-sans); text-align: left;
}
.ent-nav-group:hover { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.8); }
.ent-nav-group--open { color: rgba(255,255,255,0.75); }
.ent-nav-group-icon { font-size: 15px; width: 22px; text-align: center; flex-shrink: 0; }
.ent-nav-group-label { flex: 1; }
.ent-nav-group-chevron { transition: transform var(--transition-fast); }
.ent-nav-group--open .ent-nav-group-chevron { transform: rotate(180deg); }

.ent-nav-items { padding-left: 34px; margin-bottom: 2px; }
.ent-nav-item {
  display: block; padding: 7px 12px; border-radius: var(--radius-sm);
  font-size: 13px; color: rgba(255,255,255,0.45); text-decoration: none;
  transition: all var(--transition-fast);
}
.ent-nav-item:hover { color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.03); }
.ent-nav-item--active { background: rgba(91,95,227,0.12); color: #a5a9f0; font-weight: var(--font-medium); }

/* ═══ Footer ═══ */
.ent-side-footer {
  padding: var(--space-3) var(--space-4); border-top: 1px solid rgba(255,255,255,0.06);
  display: flex; align-items: center; gap: var(--space-3);
}
.ent-theme-btn {
  width: 32px; height: 32px; border: 1px solid rgba(255,255,255,0.1); border-radius: var(--radius-sm);
  background: none; font-size: 14px; cursor: pointer; transition: all var(--transition-fast);
  display: flex; align-items: center; justify-content: center;
}
.ent-theme-btn:hover { border-color: rgba(255,255,255,0.25); }
.ent-logout {
  padding: 6px 14px; border: 1px solid rgba(255,255,255,0.1); border-radius: var(--radius-sm);
  background: none; color: rgba(255,255,255,0.5); font-size: 12px; cursor: pointer;
  transition: all var(--transition-fast); font-family: var(--font-sans);
}
.ent-logout:hover { border-color: rgba(239,68,68,0.4); color: #ef4444; }

/* ═══ Body ═══ */
.ent-body { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
.ent-topbar {
  display: flex; align-items: center; height: var(--header-height);
  padding: 0 var(--space-5); background: var(--header-bg);
  border-bottom: 1px solid var(--header-border); backdrop-filter: blur(12px);
  gap: var(--space-4);
}
.ent-hamburger {
  display: none; flex-direction: column; justify-content: center; gap: 4px;
  width: 36px; height: 36px; border: 1px solid var(--border-light); border-radius: var(--radius-sm);
  background: none; cursor: pointer; padding: 8px;
}
.ent-hamburger span { display: block; width: 16px; height: 2px; background: var(--text-secondary); border-radius: 1px; }
.ent-title { font-size: 16px; font-weight: var(--font-medium); color: var(--text-primary); flex: 1; }
.ent-actions { display: flex; gap: var(--space-2); align-items: center; }
.ent-content { flex: 1; overflow-y: auto; padding: var(--space-6) var(--space-8); }

/* ═══ RESPONSIVE ═══ */
@media (max-width: 767px) {
  .ent-hamburger { display: flex; }
  .ent-side {
    position: fixed; left: 0; top: 0; bottom: 0; z-index: 100;
    transform: translateX(-100%); width: 260px !important; min-width: 260px !important;
  }
  .ent-side--open { transform: translateX(0); }
  .ent-overlay { display: block; }
  .ent-content { padding: var(--space-4) var(--space-3); }
}
</style>
