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

    <!-- AI助手 + 工作流 预留 -->
    <div class="wh-row">
      <div class="wh-card wh-card--ph">
        <h3>🤖 AI 助手</h3>
        <p>电商各类角色智能体，售前售后客服、店铺巡检、商品优化、选品分析等全岗位 AI 化</p>
        <span class="wh-tag">即将上线</span>
      </div>
      <div class="wh-card wh-card--ph">
        <h3>⚙ 工作流</h3>
        <p>把零散功能串成自动化流程，一键完成上新、做内容、管评价、做复盘</p>
        <span class="wh-tag">即将上线</span>
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

onMounted(async () => {
  try {
    const data = await $fetch('/api/auth/me', { credentials: 'include' })
    userName.value = (data as any).username || (data as any).email || ''
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
.wh-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.wh-card { background: #fff; border-radius: 12px; padding: 22px 20px; border: 1px solid var(--brd, #ebebea); }
.wh-card--ph { opacity: 0.7; }
.wh-card h3 { font-size: 15px; font-weight: 600; color: var(--tx, #171717); margin-bottom: 8px; }
.wh-card p { font-size: 13px; color: var(--tx2, #6b6b70); line-height: 1.5; margin-bottom: 10px; }
.wh-tag { font-size: 11px; padding: 2px 8px; border-radius: 4px; background: var(--bg-tag, #f3f4f6); color: var(--tx3, #9d9da3); }

@media (max-width: 768px) {
  .wh-quick { grid-template-columns: repeat(2, 1fr); }
  .wh-row { grid-template-columns: 1fr; }
}
</style>
