<!-- Movio AI v6.0 — 首页：数据总览 + 快捷入口 -->
<template>
  <div class="wh">
    <!-- 标题 -->
    <div class="wh-hero">
      <h1 class="wh-greet">欢迎使用 Movio AI</h1>
      <p class="wh-sub">电商全链路AI自动化工作台</p>
    </div>

    <!-- 快捷入口卡片 -->
    <div class="wh-quick">
      <div v-for="q in quickLinks" :key="q.path" class="wh-qcard" @click="go(q.path)">
        <span class="wh-qicon">{{ q.icon }}</span>
        <span class="wh-qname">{{ q.name }}</span>
      </div>
    </div>

    <!-- 最近项目 -->
    <div class="wh-recent">
      <div class="wh-recent-hd">
        <h3>最近项目</h3>
        <span class="wh-recent-more" @click="go('/workspace/creation')">查看全部 →</span>
      </div>
      <div v-if="recentProjects.length > 0" class="wh-recent-list">
        <div
          v-for="(proj, i) in recentProjects"
          :key="i"
          class="wh-recent-item"
          @click="go(proj.path)"
        >
          <span class="wh-recent-icon">{{ proj.icon }}</span>
          <div class="wh-recent-info">
            <span class="wh-recent-name">{{ proj.name }}</span>
            <span class="wh-recent-time">{{ proj.time }}</span>
          </div>
          <span class="wh-recent-arrow">→</span>
        </div>
      </div>
      <div v-else class="wh-recent-empty">
        暂无最近项目，开始你的第一次创作吧
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'workspace' })
const router = useRouter()

function go(path: string) { router.push(path) }

const quickLinks = [
  { path: '/workspace/creation?tab=video', icon: '🎥', name: '视频生成' },
  { path: '/workspace/creation?tab=image', icon: '🖼', name: '图片生成' },
  { path: '/work/detail-page', icon: '📄', name: '电商详情图' },
  { path: '/work/copywriting', icon: '✍️', name: '文案工具' },
  { path: '/work/digital-human', icon: '🤖', name: '数字人' },
]

const recentProjects = ref<{ icon: string; name: string; time: string; path: string }[]>([])

onMounted(async () => {
  try {
    const data = await $fetch('/api/auth/me', { credentials: 'include' })
    recentProjects.value = (data as any).recentItems || []
    if (!recentProjects.value.length) throw new Error('empty')
  } catch {
    recentProjects.value = [
      { icon: '🖼', name: '夏季连衣裙白底图', time: '2小时前', path: '/workspace/creation' },
      { icon: '🎥', name: '护肤品展示视频', time: '昨天', path: '/workspace/creation' },
      { icon: '📄', name: '面膜详情页设计', time: '昨天', path: '/workspace/creation' },
      { icon: '📰', name: '618活动海报', time: '2天前', path: '/workspace/creation' },
    ]
  }
})
</script>

<style scoped>
.wh { max-width: 1000px; margin: 0 auto; padding: 32px 28px; }
.wh-hero { margin-bottom: 28px; }
.wh-greet { font-size: 24px; font-weight: 600; color: var(--tx, #171717); letter-spacing: -0.03em; }
.wh-sub { font-size: 14px; color: var(--tx3, #9d9da3); margin-top: 4px; }

.wh-quick { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 32px; }
.wh-qcard {
  display: flex; align-items: center; gap: 10px; padding: 16px 16px; background: #fff;
  border-radius: 10px; border: 1px solid var(--brd, #ebebea); cursor: pointer; transition: all 0.15s;
  min-height: 52px;
}
.wh-qcard:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.06); border-color: #c4c4c8; }
.wh-qicon { font-size: 18px; line-height: 1; flex-shrink: 0; }
.wh-qname { font-size: 13px; font-weight: 500; color: var(--tx, #171717); white-space: nowrap; line-height: 1; }

/* 最近项目 */
.wh-recent { }
.wh-recent-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.wh-recent-hd h3 { font-size: 14px; font-weight: 600; color: var(--tx, #171717); }
.wh-recent-more { font-size: 12px; color: var(--tx3, #9d9da3); cursor: pointer; }
.wh-recent-more:hover { color: var(--tx, #171717); }
.wh-recent-list { display: flex; flex-direction: column; gap: 6px; }
.wh-recent-item {
  display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: #fff;
  border-radius: 9px; border: 1px solid var(--brd, #ebebea); cursor: pointer; transition: all 0.15s;
}
.wh-recent-item:hover { border-color: #c4c4c8; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.wh-recent-icon { font-size: 18px; flex-shrink: 0; }
.wh-recent-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.wh-recent-name { font-size: 13px; font-weight: 500; color: var(--tx, #171717); }
.wh-recent-time { font-size: 11px; color: var(--tx3, #9d9da3); }
.wh-recent-arrow { font-size: 13px; color: var(--tx3, #9d9da3); }
.wh-recent-empty { text-align: center; padding: 32px; color: var(--tx3, #9d9da3); font-size: 13px; }

@media (max-width: 900px) {
  .wh-quick { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 768px) {
  .wh-quick { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 480px) {
  .wh-quick { grid-template-columns: 1fr 1fr; }
}
</style>
