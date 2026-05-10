<!-- Movio AI v6.0 — 首页：数据总览 + 快捷入口 -->
<template>
  <div class="wh">
    <!-- 标题 -->
    <div class="wh-hero">
      <h1 class="wh-greet">欢迎使用 Movio AI</h1>
      <p class="wh-sub">电商全链路AI自动化工作台</p>
    </div>

    <!-- 加载骨架 -->
    <div v-if="loading" class="wh-skeleton">
      <div v-for="n in 3" :key="n" class="wh-sk-card">
        <div class="wh-sk-line wh-sk-line--lg"></div>
        <div class="wh-sk-grid">
          <div v-for="m in 4" :key="m" class="wh-sk-item"></div>
        </div>
      </div>
    </div>

    <!-- 快捷入口卡片 -->
    <div v-else v-for="(group, cat) in cardGroups" :key="cat" class="wh-section">
      <div class="wh-sec-hd">
        <h3 class="wh-sec-title">{{ cat }}</h3>
      </div>
      <div class="wh-quick">
        <div v-for="card in group" :key="card.id" class="wh-qcard" @click="go(card.route)">
          <span class="wh-qicon">{{ card.icon }}</span>
          <div class="wh-qinfo">
            <span class="wh-qname">{{ card.title }}</span>
            <span class="wh-qdesc">{{ card.desc }}</span>
          </div>
        </div>
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

type Card = { id: string; category: string; icon: string; title: string; desc: string; route: string; order: number; visible: boolean }

const loading = ref(true)
const cardGroups = ref<Record<string, Card[]>>({})

const defaultCards: Card[] = [
  { id:'img_main', category:'图片生成', icon:'🖼', title:'AI 商品图', desc:'各平台商品主图一键生成', route:'/work/image', order:1, visible:true },
  { id:'video_gen', category:'视频生成', icon:'🎥', title:'AI 短视频', desc:'商品图一键生成带货短视频', route:'/work/video', order:1, visible:true },
  { id:'detail_page', category:'电商详情图', icon:'📄', name:'详情页设计', desc:'商品详情页智能排版设计', route:'/work/detail-page', order:1, visible:true },
  { id:'copy_title', category:'文案工具', icon:'✍️', title:'标题/卖点生成', desc:'AI生成高转化商品标题', route:'/work/copywriting', order:1, visible:true },
  { id:'digital_human', category:'数字人', icon:'🤖', title:'数字人带货', desc:'数字人24小时自动带货视频', route:'/work/digital-human', order:1, visible:true },
]

const recentProjects = ref<{ icon: string; name: string; time: string; path: string }[]>([])

onMounted(async () => {
  // 加载功能卡片配置
  try {
    const cfg: any = await $fetch('/api/site-config/public')
    if (cfg?.workspace_cards && Array.isArray(cfg.workspace_cards)) {
      const cards: Card[] = cfg.workspace_cards.filter((c: Card) => c.visible !== false)
      const groups: Record<string, Card[]> = {}
      cards.forEach((c: Card) => {
        const cat = c.category || '其他'
        if (!groups[cat]) groups[cat] = []
        groups[cat].push(c)
      })
      cardGroups.value = groups
    } else {
      throw new Error('empty')
    }
  } catch (e: any) {
    console.error('[工作台] 配置加载失败，使用默认卡片', e.message)
    // fallback to defaults
    const groups: Record<string, Card[]> = {}
    defaultCards.forEach(c => {
      if (!groups[c.category]) groups[c.category] = []
      groups[c.category].push(c)
    })
    cardGroups.value = groups
  }

  // 加载最近项目
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
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.wh { max-width: 1000px; margin: 0 auto; padding: 32px 28px; }
.wh-hero { margin-bottom: 28px; }
.wh-greet { font-size: 24px; font-weight: 600; color: var(--tx, #171717); letter-spacing: -0.03em; }
.wh-sub { font-size: 14px; color: var(--tx3, #9d9da3); margin-top: 4px; }

.wh-section { margin-bottom: 28px; }
.wh-sec-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.wh-sec-title { font-size: 14px; font-weight: 600; color: var(--tx, #171717); }

.wh-quick { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
.wh-qcard {
  display: flex; align-items: center; gap: 10px; padding: 16px 16px; background: #fff;
  border-radius: 10px; border: 1px solid var(--brd, #ebebea); cursor: pointer; transition: all 0.15s;
  min-height: 52px;
}
.wh-qcard:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.06); border-color: #c4c4c8; }
.wh-qicon { font-size: 18px; line-height: 1; flex-shrink: 0; }
.wh-qinfo { flex: 1; min-width: 0; }
.wh-qname { font-size: 13px; font-weight: 500; color: var(--tx, #171717); white-space: nowrap; line-height: 1; }
.wh-qdesc { font-size: 11px; color: var(--tx3, #9d9da3); display: block; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

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

/* skeleton */
.wh-skeleton { display: flex; flex-direction: column; gap: 24px; }
.wh-sk-card { background: #fff; border-radius: 10px; border: 1px solid var(--brd, #ebebea); padding: 20px; }
.wh-sk-line { height: 16px; background: #f0f0f0; border-radius: 4px; animation: wh-shimmer 1.5s infinite; }
.wh-sk-line--lg { width: 120px; margin-bottom: 16px; }
.wh-sk-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.wh-sk-item { height: 52px; background: #f0f0f0; border-radius: 8px; animation: wh-shimmer 1.5s infinite; }
@keyframes wh-shimmer { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

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
