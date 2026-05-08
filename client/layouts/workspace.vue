<!--
  Movio AI v4.1 — Workspace Layout
  G4 前端开发 | 可折叠分组侧边导航 + 顶部栏 + 内容区
  覆盖全部 48 个工作页面，支持展开/折叠分组
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
              :to="item.path"
              class="nav-item"
              :class="{ active: currentPath.startsWith(item.path) }"
            >
              <span class="nav-icon">{{ item.icon }}</span>
              <span v-if="!sidebarCollapsed" class="nav-label">{{ item.label }}</span>
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
        <h2 class="topbar-title">{{ pageTitle }}</h2>
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

const route = useRoute()
const currentPath = computed(() => route.path)
const pageTitle = computed(() => '工作台')

const sidebarCollapsed = ref(false)
const userInitial = ref('U')
const userName = ref('')
const userPoints = ref(0)
const isAdmin = ref(false)

const openGroups = reactive(new Set(['video', 'image', 'tools', 'my']))

function toggleGroup(key: string) {
  if (openGroups.has(key)) { openGroups.delete(key) } else { openGroups.add(key) }
}

const navGroups = ref([
  {
    key: 'home', label: '', items: [
      { path: '/workspace', icon: '🏠', label: '工作台' },
    ]
  },
  {
    key: 'video', label: '🎬 视频创作',
    items: [
      { path: '/work/video', icon: '▶', label: '视频生成' },
      { path: '/work/video-edit', icon: '✂', label: '视频编辑包装' },
      { path: '/work/digital-human', icon: '🧑', label: 'AI 数字人' },
      { path: '/work/viral-replicate', icon: '🔥', label: '爆款视频分析' },
      { path: '/work/viral-clone', icon: '📋', label: '爆款视频复刻' },
      { path: '/work/storyboard', icon: '🎞', label: '视频分镜生成' },
      { path: '/work/shot-plan', icon: '📐', label: '分镜全景规划' },
      { path: '/work/product-render', icon: '🛒', label: '商品广告成片' },
      { path: '/work/person-replace', icon: '🔄', label: '角色人物替换' },
      { path: '/work/action-transfer', icon: '🕺', label: '动作迁移' },
      { path: '/work/script-gen', icon: '📝', label: '带货脚本' },
      { path: '/work/voice-gen', icon: '🔊', label: '语音生成' },
      { path: '/work/voice-clone', icon: '🎙', label: '语音克隆' },
      { path: '/work/video-translate', icon: '🌐', label: '视频翻译' },
      { path: '/work/output', icon: '📁', label: '作品管理' },
    ]
  },
  {
    key: 'image', label: '🖼 图片创作',
    items: [
      { path: '/work/image', icon: '▶', label: '图像生成' },
      { path: '/work/main-image', icon: '🖼', label: '电商主图复刻' },
      { path: '/work/batch', icon: '📦', label: '批量处理' },
      { path: '/work/compare', icon: '🔍', label: '图片对比' },
      { path: '/work/scene', icon: '🏞', label: '场景合成' },
      { path: '/work/virtual-tryon', icon: '👗', label: '虚拟试穿' },
      { path: '/work/swap-face', icon: '😊', label: '模特换脸' },
      { path: '/work/style-transfer', icon: '🎨', label: '风格迁移' },
      { path: '/work/translate-image', icon: '🔤', label: '图片翻译' },
      { path: '/work/color-swap', icon: '🎯', label: '换色' },
      { path: '/work/remove-bg', icon: '⬜', label: '去背景' },
      { path: '/work/retouch', icon: '✨', label: '图片修复' },
      { path: '/work/color-change', icon: '🎨', label: '变色' },
      { path: '/work/outpaint', icon: '⬛', label: '扩图' },
      { path: '/work/ghost-mannequin', icon: '👤', label: '幽灵人台' },
      { path: '/work/white-bg', icon: '⬜', label: '白底图' },
      { path: '/work/wrinkle-remove', icon: '🧹', label: '去皱纹' },
      { path: '/work/text-effect', icon: '🔤', label: '文字特效' },
    ]
  },
  {
    key: 'detail', label: '📄 电商详情图',
    items: [
      { path: '/work/detail', icon: '▶', label: '详情图生成' },
      { path: '/work/detail-h5', icon: '📱', label: 'H5 详情页' },
    ]
  },
  {
    key: 'poster', label: '🎨 海报与社媒',
    items: [
      { path: '/work/poster', icon: '🖼', label: '海报生成' },
      { path: '/work/social', icon: '📱', label: '社媒封面' },
    ]
  },
  {
    key: 'tools', label: '🧰 工具与服务',
    items: [
      { path: '/work/prompt-hub', icon: '💡', label: '提示词工坊' },
      { path: '/work/publish', icon: '📤', label: '多平台分发' },
      { path: '/work/distribution', icon: '📡', label: '分发管理' },
      { path: '/work/cut-ecosystem', icon: '✂', label: '裁剪生态' },
      { path: '/work/usage', icon: '📊', label: '用量仪表盘' },
      { path: '/work/model-generate', icon: '🧊', label: '3D 模型生成' },
      { path: '/work/product-render', icon: '🎬', label: '商品渲染' },
      { path: '/work/size-templates', icon: '📏', label: '尺寸模板' },
      { path: '/work/diy-pages', icon: '🛠', label: 'DIY 页面' },
      { path: '/work/brand-settings', icon: '🏷', label: '品牌设置' },
      { path: '/work/marketplace', icon: '🏪', label: '模板市场' },
      { path: '/work/compliance-check', icon: '🛡', label: '合规检测' },
      { path: '/work/platform-detail', icon: '📋', label: '平台详情' },
      { path: '/work/shot-panorama', icon: '🔄', label: '全景展示' },
      { path: '/work/image-translate', icon: '🌐', label: '图片翻译' },
      { path: '/work/outpainting', icon: '⬛', label: '扩图高级' },
    ]
  },
  {
    key: 'other', label: '', items: [
      { path: '/distribution', icon: '📤', label: '分发管理' },
      { path: '/assets', icon: '🗂', label: '素材库' },
      { path: '/member', icon: '💎', label: '会员中心' },
    ]
  },
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
  } catch {}
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
  width: 240px; background: var(--cfg-bg-primary); border-right: 1px solid var(--cfg-border);
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
.topbar-actions { display: flex; align-items: center; gap: 12px; }
.points-badge { font-size: var(--cfg-font-size-sm); color: var(--cfg-primary); font-weight: var(--cfg-font-weight-medium); }

.content { flex: 1; background: var(--cfg-bg-secondary); }

@media (max-width: 768px) {
  .sidebar { position: fixed; left: 0; top: 0; z-index: 200; transform: translateX(-100%); }
  .sidebar.mobile-open { transform: translateX(0); }
}
</style>
