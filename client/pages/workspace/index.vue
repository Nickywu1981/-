<!-- Movio AI v6.0 — 首页：数据总览 + 快捷入口 -->
<template>
  <div class="wh">
    <div class="wh-hero">
      <h1 class="wh-greet">你好，{{ userName || '开始创作吧' }}</h1>
      <p class="wh-sub">Movio AI — 电商全店内容创作中心</p>
    </div>

    <!-- 快捷入口卡片 -->
    <div class="wh-quick">
      <div v-for="q in quickLinks" :key="q.path" class="wh-qcard" @click="go(q.path)">
        <span class="wh-qicon">{{ q.icon }}</span>
        <span class="wh-qname">{{ q.name }}</span>
      </div>
    </div>

    <!-- 用量统计 -->
    <div class="wh-stats">
      <div class="wh-stat">
        <span class="wh-stat-num">{{ stats.today }}</span>
        <span class="wh-stat-label">今日生成</span>
      </div>
      <div class="wh-stat">
        <span class="wh-stat-num">{{ stats.total }}</span>
        <span class="wh-stat-label">累计产出</span>
      </div>
      <div class="wh-stat">
        <span class="wh-stat-num">{{ stats.credits }}</span>
        <span class="wh-stat-label">剩余额度</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
const router = useRouter()
const userName = ref('')
function go(path: string) { router.push(path) }

const quickLinks = [
  { path: '/workspace/creation', icon: '🎨', name: '开始创作' },
  { path: '/assets', icon: '🗂', name: '素材库' },
  { path: '/member', icon: '💎', name: '会员中心' },
  { path: '/work/usage', icon: '📊', name: '用量统计' },
]

const stats = reactive({ today: 0, total: 0, credits: 0 })

onMounted(async () => {
  try {
    const [auth, statData] = await Promise.all([
      $fetch('/api/auth/me', { credentials: 'include' }),
      $fetch('/api/user/stats', { credentials: 'include' }).catch(() => ({})),
    ])
    userName.value = (auth as any).username || (auth as any).email || ''
    stats.today = (statData as any).todayGenerations || 0
    stats.total = (statData as any).totalGenerations || 0
    stats.credits = (statData as any).credits || 0
  } catch {}
})
</script>

<style scoped>
.wh { max-width: 1000px; margin: 0 auto; padding: 32px 28px; }
.wh-hero { margin-bottom: 28px; }
.wh-greet { font-size: 24px; font-weight: 600; color: var(--tx, #171717); letter-spacing: -0.03em; }
.wh-sub { font-size: 14px; color: var(--tx3, #9d9da3); margin-top: 4px; }
.wh-quick { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 32px; }
.wh-qcard {
  display: flex; align-items: center; gap: 10px; padding: 14px 16px; background: #fff;
  border-radius: 10px; border: 1px solid var(--brd, #ebebea); cursor: pointer; transition: all 0.15s;
}
.wh-qcard:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
.wh-qicon { font-size: 20px; }
.wh-qname { font-size: 13px; font-weight: 500; color: var(--tx, #171717); }

.wh-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.wh-stat {
  background: #fff; border-radius: 10px; padding: 16px; border: 1px solid var(--brd, #ebebea);
  text-align: center;
}
.wh-stat-num { display: block; font-size: 22px; font-weight: 600; color: var(--tx, #171717); }
.wh-stat-label { font-size: 12px; color: var(--tx3, #9d9da3); margin-top: 2px; }

@media (max-width: 768px) {
  .wh-quick { grid-template-columns: repeat(2, 1fr); }
  .wh-stats { grid-template-columns: repeat(3, 1fr); }
}
</style>
