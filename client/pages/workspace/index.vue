<!-- Movio AI v6.0 — 首页：数据总览 + 快捷入口 -->
<template>
  <div class="wh">
    <!-- 标题 -->
    <div class="wh-hero">
      <h1 class="wh-greet">欢迎使用 Movio AI</h1>
      <p class="wh-sub">电商全链路AI自动化工作台</p>
    </div>

    <!-- 核心指标 -->
    <div class="wh-stats">
      <div class="wh-stat">
        <span class="wh-stat-num">{{ stats.monthly }}</span>
        <span class="wh-stat-label">本月生成次数</span>
      </div>
      <div class="wh-stat">
        <span class="wh-stat-num">{{ stats.credits }}</span>
        <span class="wh-stat-label">剩余额度</span>
      </div>
      <div class="wh-stat">
        <span class="wh-stat-num">{{ stats.storage }}</span>
        <span class="wh-stat-label">存储用量</span>
      </div>
      <div class="wh-stat">
        <span class="wh-stat-num">{{ stats.recentProjects }}</span>
        <span class="wh-stat-label">最近项目</span>
      </div>
    </div>

    <!-- 快捷入口卡片 -->
    <div class="wh-quick">
      <div v-for="q in quickLinks" :key="q.path" class="wh-qcard" @click="go(q.path)">
        <span class="wh-qicon">{{ q.icon }}</span>
        <span class="wh-qname">{{ q.name }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
const router = useRouter()

function go(path: string) { router.push(path) }

const quickLinks = [
  { path: '/workspace/creation', icon: '🎨', name: '开始创作' },
  { path: '/assets', icon: '🗂', name: '素材库' },
  { path: '/member', icon: '💎', name: '会员中心' },
  { path: '/work/usage', icon: '📊', name: '用量统计' },
]

const stats = reactive({ monthly: 0, credits: 0, storage: '0 GB', recentProjects: 0 })

onMounted(async () => {
  try {
    const [auth, statData] = await Promise.all([
      $fetch('/api/auth/me', { credentials: 'include' }),
      $fetch('/api/user/stats', { credentials: 'include' }).catch(() => ({})),
    ])
    stats.monthly = (statData as any).monthlyGenerations || 0
    stats.credits = (statData as any).credits || 0
    stats.storage = (statData as any).storageUsed || '0 GB'
    stats.recentProjects = (statData as any).recentProjects || 0
  } catch {}
})
</script>

<style scoped>
.wh { max-width: 1000px; margin: 0 auto; padding: 32px 28px; }
.wh-hero { margin-bottom: 28px; }
.wh-greet { font-size: 24px; font-weight: 600; color: var(--tx, #171717); letter-spacing: -0.03em; }
.wh-sub { font-size: 14px; color: var(--tx3, #9d9da3); margin-top: 4px; }

.wh-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 32px; }
.wh-stat {
  background: #fff; border-radius: 10px; padding: 16px; border: 1px solid var(--brd, #ebebea);
  text-align: center;
}
.wh-stat-num { display: block; font-size: 22px; font-weight: 600; color: var(--tx, #171717); }
.wh-stat-label { font-size: 12px; color: var(--tx3, #9d9da3); margin-top: 2px; }

.wh-quick { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.wh-qcard {
  display: flex; align-items: center; gap: 10px; padding: 14px 16px; background: #fff;
  border-radius: 10px; border: 1px solid var(--brd, #ebebea); cursor: pointer; transition: all 0.15s;
}
.wh-qcard:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
.wh-qicon { font-size: 20px; }
.wh-qname { font-size: 13px; font-weight: 500; color: var(--tx, #171717); }

@media (max-width: 768px) {
  .wh-quick { grid-template-columns: repeat(2, 1fr); }
  .wh-stats { grid-template-columns: repeat(2, 1fr); }
}
</style>
