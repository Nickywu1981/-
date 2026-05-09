<!--
  Movio AI v5.0 — Workspace Layout
  三大固定类目: 创作(全额开发) | AI助手(预留) | 工作流(预留)
  硬性规则: 不准增删大类、不准改名、不准乱归类
-->
<template>
  <div class="workspace-layout">
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <NuxtLink to="/workspace" class="sidebar-logo">Movio AI</NuxtLink>
        <button class="sidebar-toggle" @click="sidebarCollapsed = !sidebarCollapsed">
          {{ sidebarCollapsed ? '▶' : '◀' }}
        </button>
      </div>
      <nav class="sidebar-nav">
        <template v-for="group in navGroups" :key="group.key">
          <!-- 分组标题（可折叠） -->
          <button
            v-if="!sidebarCollapsed && group.label"
            class="nav-group-label"
            @click="toggleGroup(group.key)"
          >
            <span>{{ group.label }}</span>
            <span class="group-arrow" :class="{ open: openGroups.has(group.key) }">▾</span>
          </button>
          <!-- 导航项 -->
          <template v-if="sidebarCollapsed || !group.label || openGroups.has(group.key)">
            <NuxtLink
              v-for="item in group.items" :key="item.path"
              :to="item.disabled ? '#' : item.path"
              class="nav-item"
              :class="{
                active: !item.disabled && currentPath.startsWith(item.path),
                disabled: item.disabled,
                placeholder: item.disabled,
              }"
              @click.prevent="item.disabled ? null : undefined"
            >
              <span class="nav-icon">{{ item.icon }}</span>
              <span v-if="!sidebarCollapsed" class="nav-label">{{ item.label }}</span>
              <span v-if="!sidebarCollapsed && item.disabled" class="nav-badge">即将上线</span>
            </NuxtLink>
          </template>
        </template>
      </nav>
      <div class="sidebar-footer">
        <div class="user-brief">
          <span class="avatar-sm">{{ userInitial }}</span>
          <span v-if="!sidebarCollapsed" class="user-name">{{ userName }}</span>
        </div>
      </div>
    </aside>

    <div class="main-area">
      <header class="topbar">
        <div class="topbar-title-group">
          <h2 class="topbar-title">{{ pageTitle }}</h2>
          <span v-if="pageCategory" class="topbar-category">{{ pageCategory }}</span>
        </div>
        <div class="topbar-actions">
          <span class="points-badge">积分: {{ userPoints }}</span>
          <NuxtLink v-if="isAdmin" to="/admin" class="btn btn-ghost btn-sm">管理后台</NuxtLink>
          <button class="btn btn-ghost btn-sm" @click="handleLogout">退出登录</button>
        </div>
      </header>
      <main class="content">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'

const toast = useToast()
const route = useRoute()
const currentPath = computed(() => route.path)

// 从导航数据中动态查找当前页面标题和所属分类
const pageTitle = computed(() => {
  for (const group of navGroups.value) {
    const item = group.items.find(i => !i.disabled && currentPath.value.startsWith(i.path))
    if (item) return item.label
  }
  return '工作台'
})
const pageCategory = computed(() => {
  for (const group of navGroups.value) {
    const item = group.items.find(i => !i.disabled && currentPath.value.startsWith(i.path))
    if (item && group.label) return group.label
  }
  return ''
})

const sidebarCollapsed = ref(false)
const userInitial = ref('U')
const userName = ref('')
const userPoints = ref(0)
const isAdmin = ref(false)

const openGroups = reactive(new Set(['create-image', 'create-video']))

function toggleGroup(key: string) {
  if (openGroups.has(key)) { openGroups.delete(key) } else { openGroups.add(key) }
}

// ============================================================
// 三大固定类目 — 硬性规则：不准加第四大类
// ============================================================
const navGroups = ref([
  // ---- 首页 ----
  {
    key: 'home', label: '', items: [
      { path: '/workspace', icon: '🏠', label: '工作台首页' },
    ]
  },

  // ═══════════════════════════════════════════════════
  // 一、创作类 — 现阶段全力开发，优先级最高
  // ═══════════════════════════════════════════════════
  {
    key: 'create-image', label: '📷 创作 · 图片工具',
    items: [
      { path: '/work/image', icon: '🏠', label: '图片工具首页' },
      { path: '/work/main-image', icon: '🖼', label: '主图生成' },
      { path: '/work/scene', icon: '🏞', label: '场景图生成' },
      { path: '/work/poster', icon: '📰', label: '海报生成' },
      { path: '/work/detail', icon: '📋', label: '海报详情编辑' },
      { path: '/work/remove-bg', icon: '✂', label: '智能去背景' },
      { path: '/work/white-bg', icon: '⬜', label: '白底图生成' },
      { path: '/work/color-swap', icon: '🎯', label: '商品换色' },
      { path: '/work/color-change', icon: '🎨', label: '颜色替换' },
      { path: '/work/style-transfer', icon: '🖌', label: '风格迁移' },
      { path: '/work/text-effect', icon: '🔤', label: '文字特效' },
      { path: '/work/outpaint', icon: '↔', label: '智能外扩' },
      { path: '/work/outpainting', icon: '↕', label: '外扩入口' },
      { path: '/work/retouch', icon: '✨', label: 'AI 精修' },
      { path: '/work/wrinkle-remove', icon: '🧹', label: '去皱美颜' },
      { path: '/work/ghost-mannequin', icon: '👤', label: '幽灵模特' },
      { path: '/work/translate-image', icon: '🌐', label: '图片翻译' },
    ]
  },
  {
    key: 'create-video', label: '🎬 创作 · 视频工具',
    items: [
      { path: '/work/video', icon: '🎥', label: '视频生成' },
      { path: '/work/video-edit', icon: '✂', label: '视频编辑' },
      { path: '/work/video-translate', icon: '🌐', label: '视频翻译（语音/字幕/面容）' },
    ]
  },
  {
    key: 'create-face', label: '🧑 创作 · AI 换脸 / 数字人',
    items: [
      { path: '/work/swap-face', icon: '😊', label: 'AI 换脸' },
      { path: '/work/person-replace', icon: '🔄', label: '人物替换' },
      { path: '/work/virtual-tryon', icon: '👗', label: '虚拟试穿' },
      { path: '/work/digital-human', icon: '🤖', label: '数字人带货视频' },
      { path: '/work/model-generate', icon: '🧍', label: 'AI 模特生成' },
    ]
  },
  {
    key: 'create-voice', label: '🔊 创作 · 声音工具',
    items: [
      { path: '/work/voice-gen', icon: '🔊', label: 'AI 语音生成' },
      { path: '/work/voice-clone', icon: '🎙', label: '声音克隆' },
    ]
  },
  {
    key: 'create-copy', label: '📝 创作 · 文案工具',
    items: [
      { path: '/work/copywriting', icon: '✍', label: '智能文案（标题/卖点/种草/翻译）' },
      { path: '/work/script-gen', icon: '📝', label: '短视频脚本生成' },
    ]
  },
  {
    key: 'create-platform', label: '📐 创作 · 平台适配',
    items: [
      { path: '/work/size-templates', icon: '📏', label: '平台尺寸模板库' },
      { path: '/work/platform-detail', icon: '📋', label: '平台详情页' },
      { path: '/work/product-render', icon: '🛒', label: '产品渲染' },
      { path: '/work/detail-h5', icon: '📱', label: '详情页 H5' },
    ]
  },
  {
    key: 'create-social', label: '📱 创作 · 社媒 / 营销内容工具',
    items: [
      { path: '/work/social', icon: '📱', label: '社媒封面生成' },
      { path: '/work/action-transfer', icon: '🕺', label: '动作迁移' },
      { path: '/work/compliance-check', icon: '🛡', label: '合规检测' },
      { path: '/work/viral-clone', icon: '📋', label: '爆款克隆' },
      { path: '/work/viral-replicate', icon: '🔥', label: '爆款复刻' },
      { path: '/work/compare', icon: '🔍', label: '图片对比' },
      { path: '/work/shot-plan', icon: '📐', label: '分镜计划' },
      { path: '/work/shot-panorama', icon: '🔄', label: '全景拍摄' },
      { path: '/work/storyboard', icon: '🎞', label: '故事板' },
    ]
  },
  {
    key: 'create-efficiency', label: '⚡ 创作 · 效率工具',
    items: [
      { path: '/work/batch', icon: '📦', label: '批量处理' },
      { path: '/work/publish', icon: '📤', label: '一键发布' },
      { path: '/work/output', icon: '📁', label: '导出设置' },
      { path: '/work/usage', icon: '📊', label: '用量统计' },
      { path: '/work/brand-settings', icon: '🏷', label: '品牌设置' },
      { path: '/work/prompt-hub', icon: '💡', label: '提示词市场' },
    ]
  },
  {
    key: 'create-eco', label: '🌍 创作 · 生态 / 分发',
    items: [
      { path: '/work/diy-pages', icon: '🛠', label: 'DIY 页面' },
      { path: '/work/distribution', icon: '📡', label: '分销推广' },
      { path: '/work/cut-ecosystem', icon: '✂', label: '剪映生态' },
      { path: '/work/marketplace', icon: '🏪', label: '场景模板市场' },
    ]
  },

  // ═══════════════════════════════════════════════════
  // 二、AI 助手类 — 只预留架构和名称，暂时不开发
  // ═══════════════════════════════════════════════════
  {
    key: 'ai-placeholder', label: '🤖 AI 助手（即将上线）',
    items: [
      { path: '', icon: '💬', label: '店铺客服智能体', disabled: true },
      { path: '', icon: '🏪', label: '店铺运营智能体', disabled: true },
      { path: '', icon: '📢', label: '营销推广智能体', disabled: true },
      { path: '', icon: '🛒', label: '商品优化智能体', disabled: true },
      { path: '', icon: '🔥', label: '选品爆款智能体', disabled: true },
      { path: '', icon: '🔎', label: '竞品分析智能体', disabled: true },
      { path: '', icon: '⭐', label: '评价管理智能体', disabled: true },
      { path: '', icon: '🛡', label: '违规风控智能体', disabled: true },
      { path: '', icon: '🎓', label: '行业专家智能体', disabled: true },
      { path: '', icon: '📊', label: '数据分析智能体', disabled: true },
      { path: '', icon: '📺', label: '直播专属智能体', disabled: true },
    ]
  },

  // ═══════════════════════════════════════════════════
  // 三、工作流类 — 只预留架构和名称，暂时不开发
  // ═══════════════════════════════════════════════════
  {
    key: 'flow-placeholder', label: '⚙ 工作流（即将上线）',
    items: [
      { path: '', icon: '🏪', label: '店铺日常运营工作流', disabled: true },
      { path: '', icon: '🆕', label: '商品上新全流程工作流', disabled: true },
      { path: '', icon: '🔥', label: '爆款内容批量生产工作流', disabled: true },
      { path: '', icon: '⭐', label: '评价 & 问大家自动维护工作流', disabled: true },
      { path: '', icon: '🎉', label: '大促活动营销工作流', disabled: true },
      { path: '', icon: '📊', label: '每日数据自动复盘工作流', disabled: true },
      { path: '', icon: '🛡', label: '违规自查风控工作流', disabled: true },
      { path: '', icon: '📱', label: '私域引流转化工作流', disabled: true },
    ]
  },

  // ---- 快捷入口 ----
  {
    key: 'quick', label: '⚡ 快捷入口',
    items: [
      { path: '/assets', icon: '🗂', label: '素材库' },
      { path: '/member', icon: '💎', label: '会员中心' },
    ]
  },
  // ---- 我的 ----
  {
    key: 'my', label: '👤 我的',
    items: [
      { path: '/my/favorites', icon: '⭐', label: '我的收藏' },
      { path: '/my/collections', icon: '📁', label: '我的合集' },
      { path: '/my/templates', icon: '📋', label: '我的模板' },
      { path: '/my/works', icon: '🎬', label: '我的作品' },
      { path: '/my/orders', icon: '🧾', label: '我的订单' },
      { path: '/my/credits', icon: '💎', label: '积分明细' },
      { path: '/my/settings', icon: '⚙', label: '个人设置' },
    ]
  },
])

onMounted(async () => {
  try {
    const res: any = await $fetch('/api/user/profile', { credentials: 'include' })
    if (res.code === 200) {
      const u = res.data
      userName.value = u.nickname || ''
      userInitial.value = (u.nickname || 'U')[0].toUpperCase()
      userPoints.value = u.points_balance || 0
      isAdmin.value = ['admin', 'super_admin'].includes(u.role)
    }
  } catch { toast.error('加载用户信息失败') }
})

async function handleLogout() {
  await $fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
  navigateTo('/login')
}
</script>

<style scoped>
.workspace-layout { display: flex; min-height: 100vh; }

/* Sidebar */
.sidebar {
  width: 260px; background: var(--cfg-bg-primary); border-right: 1px solid var(--cfg-border);
  display: flex; flex-direction: column; transition: width var(--cfg-transition-base);
  position: sticky; top: 0; height: 100vh; z-index: 90;
}
.sidebar.collapsed { width: 64px; }
.sidebar-header {
  height: 56px; display: flex; align-items: center; justify-content: space-between;
  padding: 0 16px; border-bottom: 1px solid var(--cfg-border); flex-shrink: 0;
}
.sidebar-logo { font-size: var(--cfg-font-size-md); font-weight: var(--cfg-font-weight-bold); color: var(--cfg-primary); text-decoration: none; white-space: nowrap; overflow: hidden; }
.sidebar-toggle { background: none; border: none; font-size: 12px; cursor: pointer; color: var(--cfg-text-muted); padding: 4px; flex-shrink: 0; }

.sidebar-nav { flex: 1; padding: 8px; display: flex; flex-direction: column; gap: 1px; overflow-y: auto; }

/* Group label */
.nav-group-label {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px 4px; margin-top: 6px;
  font-size: 11px; font-weight: 600; color: var(--cfg-text-muted);
  text-transform: uppercase; letter-spacing: 0.5px;
  background: none; border: none; cursor: pointer; width: 100%; text-align: left;
}
.nav-group-label:hover { color: var(--cfg-text-secondary); }
.group-arrow { font-size: 10px; transition: transform 0.2s; }
.group-arrow.open { transform: rotate(180deg); }

/* Nav item */
.nav-item {
  display: flex; align-items: center; gap: 12px;
  padding: 8px 12px; border-radius: var(--cfg-radius-base);
  font-size: var(--cfg-font-size-base); color: var(--cfg-text-secondary);
  text-decoration: none; transition: all var(--cfg-transition-fast);
  white-space: nowrap;
}
.nav-item:hover { background: var(--cfg-bg-tertiary); color: var(--cfg-text-primary); }
.nav-item.active { background: var(--cfg-primary-light); color: var(--cfg-primary); font-weight: var(--cfg-font-weight-semibold); }

/* 预留占位项 */
.nav-item.disabled { opacity: 0.45; cursor: not-allowed; pointer-events: none; }
.nav-item.placeholder { background: transparent; }
.nav-badge {
  font-size: 10px; padding: 1px 6px; border-radius: 8px;
  background: var(--cfg-bg-tertiary); color: var(--cfg-text-muted);
  margin-left: auto; white-space: nowrap;
}
.nav-item.disabled .nav-badge { background: #f0f0f0; color: #999; }

.nav-icon { font-size: 16px; flex-shrink: 0; width: 20px; text-align: center; }
.nav-label { overflow: hidden; text-overflow: ellipsis; }

.sidebar-footer { padding: 12px 16px; border-top: 1px solid var(--cfg-border); flex-shrink: 0; }
.user-brief { display: flex; align-items: center; gap: 10px; }
.avatar-sm {
  width: 32px; height: 32px; border-radius: 50%;
  background: var(--cfg-primary); color: #fff; display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 600; flex-shrink: 0;
}
.user-name { font-size: var(--cfg-font-size-sm); color: var(--cfg-text-primary); overflow: hidden; text-overflow: ellipsis; }

/* Main area */
.main-area { flex: 1; display: flex; flex-direction: column; min-width: 0; }

.topbar {
  height: 56px; display: flex; align-items: center; justify-content: space-between;
  padding: 0 24px; border-bottom: 1px solid var(--cfg-border);
  background: var(--cfg-bg-primary); position: sticky; top: 0; z-index: 80;
}
.topbar-title { font-size: var(--cfg-font-size-md); font-weight: var(--cfg-font-weight-semibold); color: var(--cfg-text-primary); margin: 0; }
.topbar-title-group { display: flex; align-items: baseline; gap: 12px; }
.topbar-category { font-size: var(--cfg-font-size-xs); color: var(--cfg-text-muted); }
.topbar-actions { display: flex; align-items: center; gap: 12px; }
.points-badge { font-size: var(--cfg-font-size-sm); color: var(--cfg-primary); font-weight: var(--cfg-font-weight-medium); }

.content { flex: 1; background: var(--cfg-bg-secondary); }

@media (max-width: 768px) {
  .sidebar { position: fixed; left: 0; top: 0; z-index: 200; transform: translateX(-100%); }
  .sidebar.mobile-open { transform: translateX(0); }
}
</style>
