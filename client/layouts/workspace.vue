<!--
  Movio AI v6.0 — Workspace Layout
  四大固定导航：首页 | 创作 | AI助手 | 工作流
  硬性规则：不准增删改顶级菜单，子功能全放在对应分类内
-->
<template>
  <div class="wsl">
    <!-- ═══ 左侧导航 ═══ -->
    <aside class="wsl-side" :class="{ fold: folded }">
      <div class="wsl-logo-area">
        <NuxtLink to="/workspace" class="wsl-logo">Movio AI</NuxtLink>
        <button class="wsl-fold-btn" @click="folded = !folded" :title="folded ? '展开' : '收起'">
          {{ folded ? '▶' : '◀' }}
        </button>
      </div>

      <nav class="wsl-nav">
        <NuxtLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.disabled ? '#' : item.path"
          class="wsl-nav-item"
          :class="{ sel: !item.disabled && isActive(item), off: item.disabled }"
          @click.prevent="item.disabled ? null : undefined"
        >
          <span class="wsl-nav-icon">{{ item.icon }}</span>
          <span v-if="!folded" class="wsl-nav-label">{{ item.label }}</span>
          <span v-if="!folded && item.disabled" class="wsl-nav-tag">即将上线</span>
        </NuxtLink>
      </nav>

      <div class="wsl-footer">
        <div class="wsl-user">
          <span class="wsl-av">{{ userInitial }}</span>
          <span v-if="!folded" class="wsl-uname">{{ userName }}</span>
        </div>
        <div v-if="!folded" class="wsl-points">积分: {{ userPoints }}</div>
      </div>
    </aside>

    <!-- ═══ 右侧主区域 ═══ -->
    <div class="wsl-main">
      <header class="wsl-top">
        <h2 class="wsl-title">{{ pageTitle }}</h2>
        <div class="wsl-actions">
          <NuxtLink v-if="isAdmin" to="/admin" class="wsl-btn">管理后台</NuxtLink>
          <button class="wsl-btn" @click="handleLogout">退出登录</button>
        </div>
      </header>
      <main class="wsl-content">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const toast = useToast()
const route = useRoute()
const router = useRouter()

const folded = ref(false)
const userInitial = ref('U')
const userName = ref('')
const userPoints = ref(0)
const isAdmin = ref(false)

const currentPath = computed(() => route.path)

// ═══════════════════════════════════════════════
// 四大固定顶级导航 — 不准增删改
// ═══════════════════════════════════════════════
const navItems = [
  { path: '/workspace',            icon: '🏠', label: '首页',    disabled: false },
  { path: '/workspace/creation',   icon: '🎨', label: '创作',    disabled: false },
  { path: '/workspace/assistant',  icon: '🤖', label: 'AI 助手', disabled: false },
  { path: '/workspace/workflow',   icon: '⚙', label: '工作流',  disabled: false },
]

function isActive(item: { path: string }) {
  if (item.path === '/workspace') return currentPath.value === '/workspace'
  return currentPath.value.startsWith(item.path)
}

const pageTitle = computed(() => {
  const item = navItems.find(i => !i.disabled && isActive(i))
  return item ? item.label : '工作台'
})

async function handleLogout() {
  try {
    await $fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    toast.add({ title: '已退出登录', color: 'green' })
    router.push('/login')
  } catch {
    router.push('/login')
  }
}

onMounted(async () => {
  try {
    const data = await $fetch('/api/auth/me', { credentials: 'include' })
    userName.value = (data as any).username || (data as any).email || ''
    userPoints.value = (data as any).points || 0
    isAdmin.value = !!(data as any).isAdmin
    userInitial.value = userName.value ? userName.value.charAt(0).toUpperCase() : 'U'
  } catch {}
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
.wsl-logo { font-size: 15px; font-weight: 600; color: var(--tx, #171717); text-decoration: none; letter-spacing: -0.03em; white-space: nowrap; }
.wsl-fold-btn {
  width: 24px; height: 24px; border: none; background: none; cursor: pointer;
  color: var(--tx2, #6b6b70); font-size: 11px; border-radius: 6px; display: flex; align-items: center; justify-content: center;
}
.wsl-fold-btn:hover { background: var(--bg-hover, #f5f5f5); }

/* Nav */
.wsl-nav { flex: 1; display: flex; flex-direction: column; gap: 1px; padding: 4px 8px; overflow-y: auto; }
.wsl-nav-item {
  display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 8px;
  color: var(--tx2, #6b6b70); font-size: 13px; text-decoration: none; transition: all 0.15s; white-space: nowrap;
}
.wsl-nav-item:hover { background: var(--bg-hover, #f5f5f5); color: var(--tx, #171717); }
.wsl-nav-item.sel { background: var(--bg-sel, #171717); color: #fff; }
.wsl-nav-item.off { opacity: 0.45; cursor: default; }
.wsl-nav-item.off:hover { background: none; color: var(--tx2, #6b6b70); }
.wsl-nav-icon { font-size: 16px; width: 22px; text-align: center; flex-shrink: 0; }
.wsl-nav-label { flex: 1; }
.wsl-nav-tag { font-size: 10px; padding: 1px 6px; border-radius: 4px; background: var(--bg-tag, #f3f4f6); color: var(--tx3, #9d9da3); }

/* Footer */
.wsl-footer { padding: 10px 12px; border-top: 1px solid var(--brd, #ebebea); }
.wsl-user { display: flex; align-items: center; gap: 8px; }
.wsl-av { width: 28px; height: 28px; border-radius: 50%; background: var(--bg-av, #e8e8ec); display: flex; align-items: center; justify-content: center; font-size: 12px; color: var(--tx2, #6b6b70); flex-shrink: 0; }
.wsl-uname { font-size: 13px; color: var(--tx, #171717); }
.wsl-points { font-size: 11px; color: var(--tx3, #9d9da3); margin-top: 4px; padding-left: 36px; }

/* ═══ Main Area ═══ */
.wsl-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.wsl-top {
  display: flex; align-items: center; padding: 12px 24px; background: rgba(255,255,255,0.7);
  backdrop-filter: blur(10px); border-bottom: 1px solid var(--brd, #ebebea); flex-shrink: 0;
}
.wsl-title { font-size: 15px; font-weight: 600; color: var(--tx, #171717); letter-spacing: -0.03em; flex: 1; }
.wsl-actions { display: flex; gap: 8px; align-items: center; }
.wsl-btn {
  padding: 6px 14px; border-radius: 7px; font-size: 12px; color: var(--tx2, #6b6b70);
  background: none; border: 1px solid var(--brd, #ebebea); cursor: pointer; text-decoration: none; transition: all 0.15s;
}
.wsl-btn:hover { background: var(--bg-hover, #f5f5f5); color: var(--tx, #171717); }
.wsl-content { flex: 1; overflow-y: auto; }

/* Dark */
:root[data-theme="dark"] .wsl-side, :root.dark .wsl-side { background: #121212; border-color: #2a2a2a; }
:root[data-theme="dark"] .wsl-top, :root.dark .wsl-top { background: rgba(18,18,18,0.8); border-color: #2a2a2a; }
</style>
