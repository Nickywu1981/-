<template>
  <div class="layout">
    <a href="#main-content" class="skip-link">{{ $t('a11y.skip_to_main') }}</a>
    <header class="header">
      <div class="header-inner">
        <h1 class="logo" role="link" tabindex="0" :aria-label="$t('a11y.home_page')" @click="navigateTo('/')" @keydown.enter="navigateTo('/')">Movio AI</h1>

        <!-- 桌面导航 -->
        <nav class="nav desktop-nav">
          <NuxtLink to="/">{{ $t('nav.home') }}</NuxtLink>
          <NuxtLink v-if="user" to="/workspace">{{ $t('nav.workspace') }}</NuxtLink>
          <NuxtLink to="/help">{{ $t('nav.help') }}</NuxtLink>
          <NuxtLink to="/compare">{{ $t('nav.compare') }}</NuxtLink>
        </nav>

        <!-- 全局搜索 (Ctrl+K 唤起 CommandPalette) -->
        <div class="search-box desktop-nav" :class="{ open: searchOpen }">
          <button class="search-trigger" @click="searchOpen = !searchOpen" :title="$t('search.hotkey_title')" :aria-label="$t('search.hotkey_title')" :aria-expanded="searchOpen">
            🔍
            <kbd class="search-hotkey">Ctrl+K</kbd>
          </button>
          <input
            v-if="searchOpen"
            v-model="searchQuery"
            ref="searchInput"
            type="text"
            :placeholder="$t('search.placeholder')"
            :aria-label="$t('search.label')"
            class="search-input"
            @keydown.esc="closeSearch"
            @keydown.enter="doSearch"
          />
          <div v-if="searchOpen && searchQuery && searchResults.length > 0" class="search-dropdown">
            <div
              v-for="r in searchResults"
              :key="r.path"
              class="search-item"
              @click="closeSearch(); navigateTo(r.path)"
            >
              <span class="search-item-icon">{{ r.icon }}</span>
              <span class="search-item-name">{{ r.name }}</span>
              <span class="search-item-tag">{{ r.tag }}</span>
            </div>
          </div>
        </div>

        <div class="user-area">
          <!-- 主题切换 -->
          <button class="theme-btn" @click="toggleTheme" :title="theme === 'dark' ? $t('theme.switch_light') : $t('theme.switch_dark')" :aria-label="theme === 'dark' ? $t('theme.light_mode') : $t('theme.dark_mode')">
            {{ theme === 'dark' ? '☀️' : '🌙' }}
          </button>
          <template v-if="user">
            <NuxtLink to="/notifications" class="notif-bell" :title="$t('nav.notifications')">
              🔔
              <span v-if="unreadCount" class="badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
            </NuxtLink>
            <div class="user-menu" role="button" tabindex="0" :aria-label="$t('nav.user_menu')" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen" @keydown.enter="menuOpen = !menuOpen">
              <span class="avatar">{{ user.nickname?.[0] || 'U' }}</span>
              <span class="uname desktop-nav">{{ user.nickname }}</span>
              <span class="arrow">▾</span>
            </div>
            <div v-if="menuOpen" class="dropdown" @click.stop>
              <NuxtLink to="/account/settings" @click="menuOpen = false">{{ $t('nav.account_settings') }}</NuxtLink>
              <NuxtLink to="/account/membership" @click="menuOpen = false">{{ $t('nav.my_membership') }}</NuxtLink>
              <NuxtLink to="/account/billing" @click="menuOpen = false">{{ $t('nav.billing') }}</NuxtLink>
              <NuxtLink v-if="user?.role === 'admin'" to="/admin/dashboard" @click="menuOpen = false" class="admin-link">{{ $t('nav.admin_panel') }}</NuxtLink>
              <hr />
              <a @click="doLogout">{{ $t('nav.logout') }}</a>
            </div>
          </template>
          <template v-else>
            <NuxtLink to="/login">{{ $t('nav.login') }}</NuxtLink>
            <NuxtLink to="/register" class="btn-primary">{{ $t('nav.register') }}</NuxtLink>
          </template>

          <!-- 移动端汉堡 -->
          <button class="hamburger" @click="mobileOpen = !mobileOpen" :aria-label="mobileOpen ? $t('nav.close_menu') : $t('nav.open_menu')" :aria-expanded="mobileOpen">{{ mobileOpen ? '✕' : '☰' }}</button>
        </div>
      </div>

      <!-- 移动端展开菜单 -->
      <transition name="slide-down">
        <div v-if="mobileOpen" class="mobile-nav" @click="mobileOpen = false">
          <NuxtLink to="/">{{ $t('nav.home') }}</NuxtLink>
          <NuxtLink v-if="user" to="/workspace">{{ $t('nav.workspace') }}</NuxtLink>
          <NuxtLink to="/help">{{ $t('nav.help') }}</NuxtLink>
          <NuxtLink to="/compare">{{ $t('nav.compare') }}</NuxtLink>
          <NuxtLink to="/notifications">{{ $t('nav.notifications') }}</NuxtLink>
          <NuxtLink to="/account/settings">{{ $t('nav.account_settings') }}</NuxtLink>
          <NuxtLink to="/account/membership">{{ $t('nav.my_membership') }}</NuxtLink>
          <NuxtLink to="/account/billing">{{ $t('nav.billing') }}</NuxtLink>
          <NuxtLink v-if="user?.role === 'admin'" to="/admin/dashboard" class="admin-link-mobile">{{ $t('nav.admin_panel') }}</NuxtLink>
          <hr />
          <a @click="doLogout">{{ $t('nav.logout') }}</a>
        </div>
      </transition>
    </header>

    <main id="main-content" class="main" tabindex="-1">
      <ErrorBoundary>
        <slot />
      </ErrorBoundary>
    </main>

    <footer class="footer">
      <div class="footer-inner">
        <div class="footer-col">
          <strong>{{ $t('landing.footer_products') }}</strong>
          <NuxtLink to="/">{{ $t('nav.home') }}</NuxtLink>
          <NuxtLink to="/compare">{{ $t('nav.compare') }}</NuxtLink>
        </div>
        <div class="footer-col">
          <strong>{{ $t('landing.footer_support') }}</strong>
          <NuxtLink to="/help">{{ $t('landing.footer_help') }}</NuxtLink>
          <a href="mailto:support@example.com">{{ $t('landing.footer_contact') }}</a>
        </div>
        <div class="footer-col">
          <strong>{{ $t('landing.footer_legal') }}</strong>
          <NuxtLink to="/legal/terms">{{ $t('landing.footer_terms') }}</NuxtLink>
          <NuxtLink to="/legal/privacy">{{ $t('landing.footer_privacy') }}</NuxtLink>
        </div>
      </div>
      <p class="copyright">{{ $t('landing.footer_copyright', { year: 2025 }) }}</p>
    </footer>

    <!-- 全局搜索面板 (Ctrl+K) -->
    <SearchCommandPalette />
    <!-- 新手引导（首次访问自动弹出） -->
    <OnboardingGuide />
    <!-- 全局 Toast 通知 -->
    <Toast />
  </div>
</template>

<script setup lang="ts">
useHead({
  htmlAttrs: { lang: () => useI18n().locale.value },
  link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
});
// 全局页面 SEO — 各页面自动获得对应 TDK，无需手动设置
usePageSEO();
// Toast 由 Toast.vue 组件在挂载时自动注册到 window.__toast
const { confirm } = useConfirm()
const { t } = useI18n()
const user = ref<any>(null);
const unreadCount = ref(0);
const menuOpen = ref(false);
const mobileOpen = ref(false);
const searchOpen = ref(false);
const searchQuery = ref('');
const searchInput = ref<HTMLInputElement | null>(null);
const { theme, toggle: toggleTheme } = useTheme();

const searchIndex = [
  { name: '做主图', path: '/work/main-image', icon: '📷', tag: '图片', kw: ['主图', '商品图', '白底图', '抠图', 'main image', 'product photo', 'white bg'] },
  { name: '去背景', path: '/work/remove-bg', icon: '🖼', tag: '图片', kw: ['去背景', '抠图', '透明底', '背景移除', 'remove background', 'transparent'] },
  { name: '白底图', path: '/work/white-bg', icon: '⬜', tag: '图片', kw: ['白底', '白底图', '纯白背景', 'white background'] },
  { name: '做场景', path: '/work/scene', icon: '🖼', tag: '图片', kw: ['场景', '背景', '合成', 'scene', 'background', 'composite'] },
  { name: '做详情', path: '/work/detail-h5', icon: '📄', tag: '图片', kw: ['详情页', 'SKU', '排版', '文案', 'detail page', 'layout', 'copywriting'] },
  { name: '做视频', path: '/work/video', icon: '🎬', tag: '视频', kw: ['短视频', '带货', '商品视频', 'BGM', 'video', 'short video', 'product video'] },
  { name: '做批量', path: '/work/batch', icon: '📦', tag: '批量', kw: ['批量处理', '批量抠图', '批量生成', 'batch', 'bulk'] },
  { name: '素材库', path: '/my/works', icon: '🗂', tag: '管理', kw: ['作品', '历史', '导出', 'assets', 'history', 'export'] },
  { name: '我的模板', path: '/my/templates', icon: '📋', tag: '管理', kw: ['模板', '预设', '复用', 'template', 'preset'] },
  { name: '我的合集', path: '/my/collections', icon: '📁', tag: '管理', kw: ['合集', '收藏', '整理', 'collection', 'favorite'] },
  { name: '积分明细', path: '/my/credits', icon: '💎', tag: '管理', kw: ['积分', '余额', '消费', 'credits', 'balance'] },
  { name: '我的订单', path: '/my/orders', icon: '🧾', tag: '管理', kw: ['订单', '支付', '账单', 'order', 'payment', 'billing'] },
  { name: '虚拟模特', path: '/work/virtual-tryon', icon: '👗', tag: '图片', kw: ['试穿', '模特', '上身', 'virtual tryon', 'model', 'fitting'] },
  { name: '一键换色', path: '/work/color-swap', icon: '🎨', tag: '图片', kw: ['换颜色', '多色', 'SKU色', 'color swap', 'recolor', 'color variant'] },
  { name: '风格转化', path: '/work/style-transfer', icon: '🖌', tag: '图片', kw: ['风格', '水彩', '油画', '3D', 'style transfer', 'watercolor'] },
  { name: '动作迁移', path: '/work/action-transfer', icon: '🕺', tag: '视频', kw: ['动作', '舞蹈', '批量换人', 'action transfer', 'motion', 'dance'] },
  { name: '人物替换', path: '/work/person-replace', icon: '🧑', tag: '视频', kw: ['换人', '替换角色', 'person replace', 'swap character'] },
  { name: '口播数字人', path: '/work/digital-human', icon: '🎙', tag: '视频', kw: ['数字人', '口播', '讲解', 'digital human', 'voiceover', 'AI presenter'] },
  { name: '带货脚本', path: '/work/script-gen', icon: '📝', tag: '视频', kw: ['文案', '话术', '卖点', 'script', 'copywriting', 'sales pitch'] },
  { name: '智能分镜', path: '/work/shot-plan', icon: '🎬', tag: '视频', kw: ['分镜', '导演', '运镜', 'shot plan', 'storyboard', 'camera'] },
  { name: '爆款复刻', path: '/work/viral-clone', icon: '🔥', tag: '视频', kw: ['爆款', '模仿', '热门', 'viral clone', 'trending', 'replicate'] },
  { name: '去褶皱', path: '/work/wrinkle-remove', icon: '👔', tag: '图片', kw: ['衣服', '平整', '面料', 'wrinkle remove', 'smooth', 'fabric'] },
  { name: '图片翻译', path: '/work/image-translate', icon: '🌐', tag: '图片', kw: ['翻译', '多语言', '跨境', 'translate', 'multilingual', 'cross-border'] },
  { name: '我的会员', path: '/account/membership', icon: '💎', tag: '用户', kw: ['套餐', '升级', '付费', 'membership', 'plan', 'subscription'] },
  { name: '通知中心', path: '/notifications', icon: '🔔', tag: '用户', kw: ['消息', '提醒', 'notification', 'message', 'alert'] },
  { name: '个人设置', path: '/my/settings', icon: '⚙', tag: '用户', kw: ['资料', '密码', '手机', 'settings', 'profile', 'password'] },
  { name: '竞品对比', path: '/compare', icon: '📊', tag: '其他', kw: ['对比', 'PK', '分析', 'compare', 'benchmark', 'analysis'] },
  { name: '帮助中心', path: '/help', icon: '❓', tag: '其他', kw: ['FAQ', '教程', '使用', 'help', 'tutorial', 'guide'] },
  { name: '提示词工坊', path: '/work/prompt-hub', icon: '💡', tag: '工具', kw: ['提示词', '模板', '推荐', '评分', 'prompt', 'template', 'rating'] },
  { name: '多平台分发', path: '/work/publish', icon: '📤', tag: '工具', kw: ['分发', '抖音', '快手', '平台', '发布', 'publish', 'distribute', 'multi-platform'] },
  { name: '分发管理', path: '/work/distribution', icon: '📡', tag: '工具', kw: ['分发', '多平台', '推送', 'distribution', 'push'] },
  { name: '裁剪生态', path: '/work/cut-ecosystem', icon: '✂', tag: '工具', kw: ['裁剪', '尺寸', '平台适配', '画幅', 'crop', 'resize', 'aspect ratio'] },
  { name: '用量仪表盘', path: '/work/usage', icon: '📊', tag: '工具', kw: ['用量', '统计', '配额', '仪表盘', 'usage', 'dashboard', 'quota'] },
  { name: '我的收藏', path: '/my/favorites', icon: '⭐', tag: '管理', kw: ['收藏', '书签', '星标', 'favorite', 'bookmark', 'star'] },
];

const searchResults = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return [];
  return searchIndex.filter(item =>
    item.name.toLowerCase().includes(q) ||
    item.tag.toLowerCase().includes(q) ||
    item.kw.some(k => k.toLowerCase().includes(q))
  ).slice(0, 8);
});

function doSearch() {
  if (searchResults.value.length > 0) {
    closeSearch();
    navigateTo(searchResults.value[0].path);
  }
}

function closeSearch() {
  searchOpen.value = false;
  searchQuery.value = '';
}

// focus input when opened
watch(searchOpen, v => { if (v) nextTick(() => searchInput.value?.focus()); });

async function checkAuth() {
  try {
    const res: any = await $fetch('/api/user/profile', { credentials: 'include' });
    user.value = res.data;
    loadUnread();
  } catch (e: unknown) { if (e?.status === 401 || e?.statusCode === 401) user.value = null; }
}

async function loadUnread() {
  try {
    const res: any = await $fetch('/api/notifications/unread-count', { credentials: 'include' });
    unreadCount.value = res.data?.count || 0;
  } catch { /* 非关键，静默降级 */ }
}

async function doLogout() {
  if (!await confirm({ message: t('common.logout_confirm'), variant: 'warning' })) return;
  menuOpen.value = false;
  mobileOpen.value = false;
  try { await $fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch { /* best-effort */ }
  user.value = null;
  navigateTo('/login');
}

// 路由变化时关闭菜单
watch(() => useRoute().path, () => { menuOpen.value = false; mobileOpen.value = false; });

onMounted(checkAuth);
</script>

<style scoped>
/* Skip-to-content — visually hidden until focused */
.skip-link {
  position: absolute; top: -100px; left: 16px; z-index: 10000;
  background: var(--brand, #3b82f6); color: #fff; padding: 10px 20px;
  border-radius: 0 0 8px 8px; font-size: 14px; text-decoration: none;
}
.skip-link:focus { top: 0; }

/* ================================================
   LAYOUT BASE
   ================================================ */
.layout { min-height: 100vh; display: flex; flex-direction: column; background: var(--bg-page); color: var(--text-primary); }

/* ================================================
   HEADER — sticky, 56px, full-width
   ================================================ */
.header {
  background: var(--bg-header);
  border-bottom: 1px solid var(--border-light);
  position: sticky; top: 0; z-index: 100;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.header-inner {
  max-width: 1200px; margin: 0 auto;
  padding: 0 clamp(12px, 3vw, 24px);
  height: 56px; display: flex; align-items: center; gap: clamp(12px, 2vw, 24px);
}

/* Logo */
.logo {
  font-size: clamp(15px, 2vw, 18px);
  font-weight: 700; color: var(--text-primary);
  cursor: pointer; white-space: nowrap;
  flex-shrink: 0;
  transition: opacity var(--transition-fast);
}
.logo:hover { opacity: 0.8; }
.logo:focus-visible { opacity: 0.8; outline: 2px solid var(--brand); outline-offset: 4px; border-radius: 4px; }

/* Desktop nav */
.nav { display: flex; gap: clamp(8px, 1.5vw, 20px); flex-shrink: 0; }
.nav a {
  color: var(--text-secondary); font-size: 14px; text-decoration: none;
  white-space: nowrap; transition: color var(--transition-fast);
  padding: 4px 0;
}
.nav a:hover { color: var(--brand); }
.nav a.router-link-active { color: var(--brand); font-weight: 600; }

/* ================================================
   USER AREA
   ================================================ */
.user-area { margin-left: auto; display: flex; gap: 8px; align-items: center; position: relative; flex-shrink: 0; }
.user-area a { font-size: 14px; color: var(--text-secondary); text-decoration: none; white-space: nowrap; }
.user-area a:hover { color: var(--brand); }

.btn-primary {
  background: var(--brand-gradient); color: #fff !important;
  padding: 6px clamp(12px, 2vw, 18px); border-radius: 8px;
  font-weight: 600; font-size: 13px;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast), opacity var(--transition-fast);
}
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 2px 12px rgba(124,58,237,0.35); }

/* Theme toggle */
.theme-btn {
  background: none; border: 1px solid var(--border-light);
  border-radius: 8px; font-size: 16px; cursor: pointer;
  padding: 6px 8px; transition: background var(--transition-fast), border-color var(--transition-fast);
  flex-shrink: 0;
}
.theme-btn:hover { background: var(--bg-hover); border-color: var(--brand); }
.theme-btn:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }

/* Notification bell */
.notif-bell { position: relative; font-size: 18px; text-decoration: none; flex-shrink: 0; }
.notif-bell .badge {
  position: absolute; top: -6px; right: -8px;
  background: var(--brand); color: #fff;
  font-size: 10px; padding: 1px 5px; border-radius: 10px;
  font-weight: 600; min-width: 16px; text-align: center;
}

/* User avatar + menu */
.user-menu {
  display: flex; align-items: center; gap: 6px;
  cursor: pointer; padding: 4px 8px; border-radius: 8px;
  transition: background var(--transition-fast);
}
.user-menu:hover { background: var(--bg-hover); }

.avatar {
  width: 30px; height: 30px;
  background: var(--brand-gradient); color: #fff;
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 600; flex-shrink: 0;
}
.uname { font-size: 13px; color: var(--text-primary); }
.arrow { font-size: 10px; color: var(--text-muted); transition: transform var(--transition-fast); }

/* Dropdown menu */
.dropdown {
  position: absolute; top: calc(100% + 8px); right: 0;
  background: var(--bg-card); border: 1px solid var(--border-light);
  border-radius: 12px; box-shadow: var(--shadow-dropdown);
  min-width: 180px; padding: 6px; z-index: 200;
  animation: modal-enter var(--transition-base) ease-out;
}
.dropdown a {
  display: block; padding: 10px 14px; font-size: 13px;
  color: var(--text-primary); text-decoration: none;
  border-radius: 8px; cursor: pointer; transition: background var(--transition-fast);
}
.dropdown a:hover { background: var(--bg-hover); }
.dropdown .admin-link { color: var(--brand) !important; font-weight: 600; }
.dropdown hr { border: none; border-top: 1px solid var(--border-light); margin: 4px 8px; }

/* ================================================
   SEARCH
   ================================================ */
.search-box { position: relative; flex-shrink: 0; }
.search-box.open { flex: 1; max-width: 320px; }
.search-trigger {
  background: none; border: none; font-size: 18px; cursor: pointer;
  padding: 4px 6px; border-radius: 8px; transition: background var(--transition-fast);
  display: flex; align-items: center; gap: 6px;
}
.search-trigger:hover { background: var(--bg-hover); }
.search-hotkey {
  font-size: 10px; background: var(--bg-hover); border: 1px solid var(--border-light);
  padding: 1px 5px; border-radius: 4px; color: var(--text-muted);
  font-family: inherit; letter-spacing: 0.3px;
}

.search-input {
  width: 100%; padding: 8px 14px; border: 1px solid var(--brand); border-radius: 8px;
  font-size: 14px; outline: none;
  background: var(--bg-input); color: var(--text-primary);
  transition: border-color var(--transition-base), box-shadow var(--transition-base);
  animation: fadeIn var(--transition-fast) ease-out;
}
.search-input::placeholder { color: var(--text-muted); }
.search-input:focus { box-shadow: 0 0 0 3px rgba(124,58,237,0.15); }

.search-dropdown {
  position: absolute; right: 0; top: calc(100% + 8px);
  width: 280px; background: var(--bg-card); border: 1px solid var(--border-light);
  border-radius: 12px; box-shadow: var(--shadow-dropdown); z-index: 300;
  overflow: hidden; animation: modal-enter var(--transition-base) ease-out;
}
.search-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 14px;
  cursor: pointer; font-size: 13px; transition: background 0.1s;
}
.search-item:hover { background: var(--bg-hover); }
.search-item-icon { font-size: 16px; flex-shrink: 0; }
.search-item-name { flex: 1; color: var(--text-primary); font-weight: 500; }
.search-item-tag { font-size: 11px; color: var(--text-muted); background: var(--tag-bg); padding: 1px 6px; border-radius: 4px; }

/* ================================================
   HAMBURGER & MOBILE NAV
   ================================================ */
.hamburger {
  display: none; background: none; border: 1px solid var(--border-light);
  font-size: 18px; cursor: pointer; padding: 6px 8px; border-radius: 8px;
  color: var(--text-secondary); transition: background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast);
}
.hamburger:hover { border-color: var(--brand); color: var(--brand); background: var(--bg-hover); }
.hamburger:focus-visible { border-color: var(--brand); outline: 2px solid var(--brand); outline-offset: 2px; }

.mobile-nav {
  display: none; flex-direction: column;
  background: var(--bg-card); border-bottom: 1px solid var(--border-light);
  padding: 8px 16px 16px; gap: 2px;
  animation: slide-down-enter 0.25s ease-out;
}
.mobile-nav a {
  font-size: 14px; color: var(--text-primary); text-decoration: none;
  padding: 10px 12px; display: block; cursor: pointer;
  border-radius: 8px; transition: background var(--transition-fast);
}
.mobile-nav a:hover { background: var(--bg-hover); }
.mobile-nav a.router-link-exact-active { color: var(--brand); font-weight: 600; background: var(--bg-hover); }
.mobile-nav .admin-link-mobile { color: var(--brand) !important; font-weight: 600; }
.mobile-nav hr { border: none; border-top: 1px solid var(--border-light); margin: 6px 8px; }

/* ================================================
   MOBILE SEARCH OVERLAY
   ================================================ */
.mobile-search-overlay {
  display: none; position: fixed; inset: 0; top: 56px;
  background: var(--bg-page); z-index: 250;
  padding: 20px 16px;
}
.mobile-search-overlay.open { display: block; }
.mobile-search-input {
  width: 100%; padding: 12px 16px; border: 1px solid var(--border-light);
  border-radius: 12px; font-size: 16px; background: var(--bg-input); color: var(--text-primary);
  outline: none; margin-bottom: 16px;
}
.mobile-search-input:focus { border-color: var(--brand); box-shadow: 0 0 0 3px rgba(124,58,237,0.12); }
.mobile-search-cancel {
  display: block; width: 100%; padding: 12px; border: none;
  border-radius: 10px; background: var(--bg-hover); color: var(--text-secondary);
  font-size: 14px; cursor: pointer; text-align: center;
}
.mobile-search-results .search-item {
  padding: 12px 14px; border-radius: 10px;
}

/* ================================================
   BREAKPOINTS
   ================================================ */

/* Tablet — shrink gaps, hide username */
@media (max-width: 900px) {
  .header-inner { gap: 10px; }
  .nav { gap: 6px; }
  .nav a { font-size: 13px; }
  .uname { display: none; }
  .search-input { max-width: 180px; font-size: 13px; }
}

/* Mobile — hamburger menu */
@media (max-width: 640px) {
  .desktop-nav { display: none; }
  .hamburger { display: flex; align-items: center; justify-content: center; }
  .mobile-nav { display: flex; }
  .search-input { display: none; }
  .search-box .search-dropdown { display: none; }
  .logo { font-size: 16px; }
  .btn-primary { font-size: 12px; padding: 5px 12px; }
  .theme-btn { font-size: 14px; padding: 4px 6px; }
  .notif-bell { font-size: 16px; }
}

/* Small mobile */
@media (max-width: 380px) {
  .header-inner { padding: 0 8px; gap: 6px; }
  .logo { font-size: 14px; }
  .btn-primary { display: none; }
  .user-area { gap: 4px; }
}

/* ================================================
   TRANSITIONS
   ================================================ */
.slide-down-enter-active { animation: slide-down-enter 0.25s ease-out; }
.slide-down-leave-active { animation: slide-down-leave 0.2s ease-in; }

@keyframes slide-down-enter {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes slide-down-leave {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(-8px); }
}

/* ================================================
   MAIN CONTENT
   ================================================ */
.main { flex: 1; }

/* ================================================
   FOOTER
   ================================================ */
.footer { background: var(--bg-footer); border-top: 1px solid var(--border-light); padding: 40px 16px 24px; }
.footer-inner { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(3, 1fr); gap: clamp(16px, 3vw, 32px); }
.footer-col { display: flex; flex-direction: column; gap: 8px; }
.footer-col strong { font-size: 13px; color: var(--text-primary); margin-bottom: 4px; }
.footer-col a { font-size: 13px; color: var(--text-muted); text-decoration: none; transition: color var(--transition-fast); }
.footer-col a:hover { color: var(--brand); }
.footer-col .router-link-active { color: var(--brand); }
.copyright { text-align: center; margin-top: 24px; font-size: 11px; color: var(--text-muted); }

@media (max-width: 500px) {
  .footer { padding: 24px 16px 18px; }
  .footer-inner { grid-template-columns: repeat(2, 1fr); gap: 16px; }
}
</style>
