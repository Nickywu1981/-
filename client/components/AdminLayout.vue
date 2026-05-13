<!--
  AdminLayout — 管理后台骨架：分组侧边栏 + 顶栏 + 内容区
  与工作台共享同一套「温润精工」设计语言
-->
<template>
  <div class="al">
    <!-- 移动端汉堡 -->
    <button class="al-ham" @click="open = !open" :aria-label="open ? $t('admin_layout.close_menu') : $t('admin_layout.open_menu')">{{ open ? '✕' : '☰' }}</button>

    <!-- 左侧分组导航 -->
    <aside class="al-side" :class="{ on: open }">
      <div class="al-logo" @click="$router.push('/admin/dashboard')">
        <span class="al-logo-dot"></span>
        {{ brandName }}
      </div>

      <nav class="al-nav">
        <template v-for="g in groups" :key="g.key">
          <div
            class="al-grp-hd"
            @click="g.open = !g.open"
          >
            <span class="al-grp-ic">{{ g.icon }}</span>
            <span class="al-grp-lbl">{{ $t('admin_nav.groups.' + g.key) }}</span>
            <span class="al-grp-arr" :class="{ down: g.open }">▸</span>
          </div>
          <div v-show="g.open" class="al-grp-body">
            <NuxtLink
              v-for="item in g.items"
              :key="item.key"
              :to="item.route"
              class="al-item"
            >{{ $t('admin_nav.items.' + item.key) }}</NuxtLink>
          </div>
        </template>
      </nav>

      <div class="al-side-ft">
        <button class="al-theme-btn" @click="toggleTheme" :title="theme === 'dark' ? $t('admin_layout.switch_light') : $t('admin_layout.switch_dark')" :aria-label="theme === 'dark' ? $t('admin_layout.switch_light') : $t('admin_layout.switch_dark')">
          {{ theme === 'dark' ? '☀️' : '🌙' }}
        </button>
        <NuxtLink to="/workspace" class="al-back">← {{ $t('admin_layout.back_workspace') }}</NuxtLink>
      </div>
    </aside>

    <!-- 遮罩 -->
    <div v-if="open" class="al-mask" @click="open = false" />

    <!-- 右侧主区域 -->
    <main class="al-main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const open = ref(false)
const route = useRoute()
const { theme, toggle: toggleTheme } = useTheme()
watch(() => route.path, () => { open.value = false })

withDefaults(defineProps<{ brandName?: string }>(), { brandName: 'Movio Admin' })

interface NavItem { key: string; route: string }
interface NavGroup { key: string; icon: string; open: boolean; items: NavItem[] }

const groups = reactive<NavGroup[]>([
  {
    key: 'overview', icon: '📊', open: true,
    items: [
      { key: 'dashboard', route: '/admin/dashboard' },
      { key: 'analytics', route: '/admin/analytics' },
    ],
  },
  {
    key: 'users', icon: '👥', open: false,
    items: [
      { key: 'users', route: '/admin/users' },
      { key: 'tenants', route: '/admin/tenants' },
      { key: 'tier', route: '/admin/tier' },
    ],
  },
  {
    key: 'finance', icon: '💳', open: false,
    items: [
      { key: 'plans', route: '/admin/plans' },
      { key: 'orders', route: '/admin/orders' },
      { key: 'recharge', route: '/admin/recharge' },
      { key: 'credits', route: '/admin/credits' },
    ],
  },
  {
    key: 'ops', icon: '📋', open: false,
    items: [
      { key: 'tasks', route: '/admin/tasks' },
      { key: 'automation', route: '/admin/automation' },
      { key: 'notifications', route: '/admin/notifications' },
      { key: 'badges', route: '/admin/badges' },
      { key: 'campaigns', route: '/admin/campaigns' },
      { key: 'enterprises', route: '/admin/enterprises' },
      { key: 'coupons', route: '/admin/coupons' },
      { key: 'announcements', route: '/admin/announcements' },
    ],
  },
  {
    key: 'content', icon: '🎨', open: false,
    items: [
      { key: 'collection', route: '/admin/collection' },
      { key: 'prompts', route: '/admin/prompts' },
      { key: 'templates', route: '/admin/templates' },
      { key: 'diy-pages', route: '/admin/diy-pages' },
      { key: 'workspace-diy', route: '/admin/workspace-diy' },
    ],
  },
  {
    key: 'msg', icon: '📢', open: false,
    items: [
      { key: 'sms-templates', route: '/admin/sms-templates' },
      { key: 'sms-logs', route: '/admin/sms-logs' },
      { key: 'email-templates', route: '/admin/email-templates' },
    ],
  },
  {
    key: 'security', icon: '🛡️', open: false,
    items: [
      { key: 'moderation', route: '/admin/moderation' },
      { key: 'abuse', route: '/admin/abuse' },
      { key: 'compliance', route: '/admin/compliance' },
      { key: 'geo-rules', route: '/admin/geo-rules' },
    ],
  },
  {
    key: 'system', icon: '⚙️', open: false,
    items: [
      { key: 'site-config', route: '/admin/site-config' },
      { key: 'brand-settings', route: '/admin/brand-settings' },
      { key: 'ai-models', route: '/admin/ai-models' },
      { key: 'ab-experiments', route: '/admin/ab-experiments' },
      { key: 'multilingual', route: '/admin/multilingual' },
      { key: 'proxy', route: '/admin/proxy' },
      { key: 'config', route: '/admin/config' },
      { key: 'settings', route: '/admin/settings' },
      { key: 'kb-management', route: '/admin/kb-management' },
    ],
  },
  {
    key: 'tools', icon: '🔧', open: false,
    items: [
      { key: 'forms', route: '/admin/forms' },
      { key: 'form-templates', route: '/admin/form-templates' },
      { key: 'size-templates', route: '/admin/size-templates' },
      { key: 'test-workbench', route: '/admin/test-workbench' },
    ],
  },
  {
    key: 'audit', icon: '📝', open: false,
    items: [
      { key: 'logs', route: '/admin/logs' },
      { key: 'ai-logs', route: '/admin/ai-logs' },
    ],
  },
])

// Auto-expand the group containing current route
watch(() => route.path, (p) => {
  for (const g of groups) {
    if (g.items.some(it => p.startsWith(it.route))) {
      g.open = true
    }
  }
}, { immediate: true })
</script>

<style scoped>
/* ================================================
   ADMIN LAYOUT — 与 workspace 一脉相承
   ================================================ */
.al {
  display: flex;
  min-height: calc(100vh - 56px);
  position: relative;
}

/* ---- 移动端汉堡 ---- */
.al-ham {
  display: none;
  position: fixed; top: 64px; left: 12px; z-index: 200;
  background: var(--bg-card); color: var(--text-primary);
  border: 1px solid var(--border-light); width: 38px; height: 38px;
  border-radius: 8px; font-size: 17px; cursor: pointer;
}
.al-ham:hover { background: var(--border-light); }

/* ---- 侧边栏 ---- */
.al-side {
  width: 200px; min-width: 200px;
  background: var(--bg-card); border-right: 1px solid var(--border-light);
  display: flex; flex-direction: column;
  padding: 12px 8px; gap: 2px;
  overflow-y: auto; z-index: 150;
  transition: transform 0.25s;
  flex-shrink: 0;
}

.al-logo {
  font-size: 15px; font-weight: 600; color: var(--text-primary);
  padding: 4px 10px 12px; letter-spacing: -0.03em;
  display: flex; align-items: center; gap: 7px;
  cursor: pointer;
}
.al-logo-dot { width: 7px; height: 7px; border-radius: 2px; background: var(--text-primary); }

.al-nav { display: flex; flex-direction: column; gap: 0; flex: 1; }

/* ---- 分组标题 ---- */
.al-grp-hd {
  display: flex; align-items: center; gap: 7px;
  padding: 8px 10px; border-radius: 8px;
  font-size: 12.5px; color: var(--text-muted); font-weight: 500;
  cursor: pointer; user-select: none;
  transition: background 0.15s, color 0.15s;
}
.al-grp-hd:hover { background: var(--border-light); color: var(--text-secondary); }
.al-grp-ic { font-size: 13px; width: 18px; text-align: center; flex-shrink: 0; }
.al-grp-lbl { flex: 1; }
.al-grp-arr {
  font-size: 10px; transition: transform 0.15s;
  color: var(--text-muted); flex-shrink: 0;
}
.al-grp-arr.down { transform: rotate(90deg); }

/* ---- 分组子项 ---- */
.al-grp-body {
  display: flex; flex-direction: column;
  padding-left: 24px; margin-bottom: 4px;
}
.al-item {
  display: block; padding: 7px 10px; border-radius: 6px;
  font-size: 13px; color: var(--text-secondary); text-decoration: none;
  transition: background 0.15s, color 0.15s;
}
.al-item:hover { background: var(--border-light); color: var(--text-primary); }
.al-item.router-link-active {
  background: var(--brand); color: var(--white); font-weight: 500;
}

/* ---- 侧边栏底部 ---- */
.al-side-ft {
  padding: 8px 10px; border-top: 1px solid var(--border-light);
}
.al-back {
  font-size: 12px; color: var(--text-muted); text-decoration: none;
  transition: color 0.15s;
}
.al-back:hover { color: var(--text-primary); }
.al-theme-btn {
  background: none; border: 1px solid var(--border-light);
  border-radius: 8px; font-size: 16px; cursor: pointer;
  padding: 4px 6px; margin-right: 8px;
  transition: background var(--transition-fast), border-color var(--transition-fast);
}
.al-theme-btn:hover { background: var(--bg-hover); border-color: var(--brand); }

/* ---- 主内容 ---- */
.al-main {
  flex: 1; padding: 28px 32px;
  background: var(--bg-page); overflow-y: auto;
  min-width: 0;
}

/* ---- 遮罩 ---- */
.al-mask { display: none; }

/* ---- 响应式 ---- */
@media (max-width: 768px) {
  .al-ham { display: flex; align-items: center; justify-content: center; }

  .al-side {
    position: fixed; top: 56px; left: 0; bottom: 0;
    transform: translateX(-100%); z-index: 160;
    box-shadow: 0 8px 32px rgba(0,0,0,0.08);
  }
  .al-side.on { transform: translateX(0); }

  .al-mask {
    display: block; position: fixed; inset: 0; top: 56px;
    background: rgba(0,0,0,0.25); z-index: 155;
  }

  .al-main { padding: 16px; }
}

@media (min-width: 769px) and (max-width: 1100px) {
  .al-side { width: 180px; min-width: 180px; }
  .al-item { font-size: 12px; padding: 6px 9px; }
}

.al-side::-webkit-scrollbar { width: 4px; }
.al-side::-webkit-scrollbar-thumb { background: var(--border-light); border-radius: 4px; }
.al-side::-webkit-scrollbar-track { background: transparent; }
</style>
