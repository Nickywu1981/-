<!-- Movio AI v6.0 — 首页：数据总览 + 快捷入口 -->
<template>
  <div class="wh">
    <!-- 标题 -->
    <div class="wh-hero">
      <h1 class="wh-greet">{{ $t('workspace.greeting') }}</h1>
      <p class="wh-sub">{{ $t('workspace.subtitle') }}</p>
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
    <template v-else>
      <div v-for="(group, cat) in cardGroups" :key="cat" class="wh-section">
        <div class="wh-sec-hd">
          <h3 class="wh-sec-title">{{ getCategoryLabel(cat) }}</h3>
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
    </template>

    <!-- 最近项目 -->
    <div class="wh-recent">
      <div class="wh-recent-hd">
        <h3>{{ $t('workspace.recent_projects') }}</h3>
        <span class="wh-recent-more" @click="go('/workspace/creation')">{{ $t('workspace.view_all') }} →</span>
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
        {{ $t('workspace.no_projects') }}
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
const visibleCards = ref<Set<Element>>(new Set())

const { t } = useI18n()

const defaultCards = computed<Card[]>(() => {
  const fromI18n = t('workspace.default_cards') as Card[]
  if (Array.isArray(fromI18n) && fromI18n.length) return fromI18n
  return [
    { id:'img_main', category:'image', icon:'🖼', title:'AI 商品图', desc:'各平台商品主图一键生成', route:'/work/image', order:1, visible:true },
    { id:'video_gen', category:'video', icon:'🎥', title:'AI 短视频', desc:'商品图一键生成带货短视频', route:'/work/video', order:1, visible:true },
    { id:'detail_page', category:'detail', icon:'📄', title:'详情页设计', desc:'商品详情页智能排版设计', route:'/work/detail-page', order:1, visible:true },
    { id:'copy_title', category:'copywrite', icon:'✍️', title:'标题/卖点生成', desc:'AI生成高转化商品标题', route:'/work/copywriting', order:1, visible:true },
    { id:'digital_human', category:'digital', icon:'🤖', title:'数字人带货', desc:'数字人24小时自动带货视频', route:'/work/digital-human', order:1, visible:true },
  ]
})

function getCategoryLabel(cat: string): string {
  const key = `workspace.creation_tabs.${cat}` as string
  const translated = t(key)
  return translated !== key ? translated : cat
}

const recentProjects = ref<{ icon: string; name: string; time: string; path: string }[]>([])

onMounted(async () => {
  try {
    const [cfgResult, meResult] = await Promise.allSettled([
    $fetch('/api/site-config/public'),
    $fetch('/api/auth/me', { credentials: 'include' }),
  ])

  // 加载功能卡片配置
  if (cfgResult.status === 'fulfilled') {
    const cfg: any = cfgResult.value
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
      const groups: Record<string, Card[]> = {}
      defaultCards.value.forEach(c => {
        if (!groups[c.category]) groups[c.category] = []
        groups[c.category].push(c)
      })
      cardGroups.value = groups
    }
  } else {
    // 静默降级：使用默认卡片
    const groups: Record<string, Card[]> = {}
    defaultCards.value.forEach(c => {
      if (!groups[c.category]) groups[c.category] = []
      groups[c.category].push(c)
    })
    cardGroups.value = groups
  }

  // 加载最近项目
  if (meResult.status === 'fulfilled') {
    const data: any = meResult.value
    recentProjects.value = (data).recentItems || []
  }
  if (!recentProjects.value.length) {
    const samples = t('workspace.recent_samples') as { icon: string; name: string; time: string }[]
    if (Array.isArray(samples) && samples.length) {
      recentProjects.value = samples.map(s => ({ ...s, path: '/workspace/creation' }))
    }
  }

  } catch {
    // 静默降级：使用默认卡片
    const groups: Record<string, Card[]> = {};
    defaultCards.value.forEach(c => {
      if (!groups[c.category]) groups[c.category] = [];
      groups[c.category].push(c);
    });
    cardGroups.value = groups;
  } finally {
    loading.value = false;
  }

  // Entrance animations for cards
  let _obs: IntersectionObserver | null = null
  let _animTimer1: ReturnType<typeof setTimeout> | undefined
  let _animTimer2: ReturnType<typeof setTimeout> | undefined
  if (process.client && window.IntersectionObserver) {
    _obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting && !visibleCards.value.has(e.target)) {
          visibleCards.value.add(e.target)
          e.target.classList.add('wh-in')
        }
      })
    }, { threshold: 0.1 })
    _animTimer1 = setTimeout(() => {
      document.querySelectorAll('.wh-qcard').forEach(el => _obs!.observe(el))
    }, 100)
    // Safety: reveal all cards after 2.5s
    _animTimer2 = setTimeout(() => {
      document.querySelectorAll('.wh-qcard').forEach(el => {
        if (!visibleCards.value.has(el)) { el.classList.add('wh-in') }
      })
    }, 2500)
  }
  onUnmounted(() => {
    if (_obs) _obs.disconnect()
    if (_animTimer1) clearTimeout(_animTimer1)
    if (_animTimer2) clearTimeout(_animTimer2)
  })
})
</script>

<style scoped>
.wh { max-width: 1000px; margin: 0 auto; padding: 32px 28px; --wh-card-bg: #fff; --wh-skel-bg: #f0f0f0; --wh-border-hover: #c4c4c8; --wh-shadow-hover: 0 4px 16px rgba(0,0,0,0.06); --wh-shadow-item: 0 2px 8px rgba(0,0,0,0.04); }
.wh-hero { margin-bottom: 28px; }
.wh-greet { font-size: 24px; font-weight: 500; color: var(--tx, #171717); letter-spacing: -0.03em; }
.wh-sub { font-size: 14px; color: var(--tx3, #9d9da3); margin-top: 4px; }

.wh-section { margin-bottom: 28px; }
.wh-sec-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.wh-sec-title { font-size: 14px; font-weight: 500; color: var(--tx, #171717); }

.wh-quick { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
.wh-qcard {
  display: flex; align-items: center; gap: 10px; padding: 16px 16px; background: var(--wh-card-bg);
  border-radius: 10px; border: 1px solid var(--brd, #ebebea); cursor: pointer; transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
  min-height: 52px;
}
.wh-qcard:hover { transform: translateY(-2px); box-shadow: var(--wh-shadow-hover); border-color: var(--wh-border-hover); }
.wh-qcard:focus-visible { outline: 2px solid var(--brand, #5b5fe3); outline-offset: 2px; }
.wh-qicon { font-size: 18px; line-height: 1; flex-shrink: 0; }
.wh-qinfo { flex: 1; min-width: 0; }
.wh-qname { font-size: 13px; font-weight: 500; color: var(--tx, #171717); white-space: nowrap; line-height: 1; }
.wh-qdesc { font-size: 11px; color: var(--tx3, #9d9da3); display: block; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 最近项目 */
.wh-recent { }
.wh-recent-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.wh-recent-hd h3 { font-size: 14px; font-weight: 500; color: var(--tx, #171717); }
.wh-recent-more { font-size: 12px; color: var(--tx3, #9d9da3); cursor: pointer; }
.wh-recent-more:hover { color: var(--tx, #171717); }
.wh-recent-list { display: flex; flex-direction: column; gap: 6px; }
.wh-recent-item {
  display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: var(--wh-card-bg);
  border-radius: 9px; border: 1px solid var(--brd, #ebebea); cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s;
}
.wh-recent-item:hover { border-color: var(--wh-border-hover); box-shadow: var(--wh-shadow-item); }
.wh-recent-item:focus-visible { outline: 2px solid var(--brand, #5b5fe3); outline-offset: 2px; }
.wh-recent-icon { font-size: 18px; flex-shrink: 0; }
.wh-recent-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.wh-recent-name { font-size: 13px; font-weight: 500; color: var(--tx, #171717); }
.wh-recent-time { font-size: 11px; color: var(--tx3, #9d9da3); }
.wh-recent-arrow { font-size: 13px; color: var(--tx3, #9d9da3); }
.wh-recent-empty { text-align: center; padding: 32px; color: var(--tx3, #9d9da3); font-size: 13px; }

/* skeleton */
.wh-skeleton { display: flex; flex-direction: column; gap: 24px; }
.wh-sk-card { background: var(--wh-card-bg); border-radius: 10px; border: 1px solid var(--brd, #ebebea); padding: 20px; }
.wh-sk-line { height: 16px; background: var(--wh-skel-bg); border-radius: 4px; animation: wh-shimmer 1.5s infinite; }
.wh-sk-line--lg { width: 120px; margin-bottom: 16px; }
.wh-sk-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.wh-sk-item { height: 52px; background: var(--wh-skel-bg); border-radius: 8px; animation: wh-shimmer 1.5s infinite; }
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

/* Dark mode */
:root[data-theme="dark"] .wh, :root.dark .wh {
  --wh-card-bg: #1a1a1a;
  --wh-skel-bg: #2a2a2a;
  --wh-border-hover: #3a3a3a;
  --wh-shadow-hover: 0 4px 16px rgba(0,0,0,0.2);
  --wh-shadow-item: 0 2px 8px rgba(0,0,0,0.15);
}

/* Entrance animations */
.wh-qcard { opacity: 0; transform: translateY(16px); transition: opacity 0.4s cubic-bezier(0.22, 1, 0.36, 1), transform 0.4s cubic-bezier(0.22, 1, 0.36, 1); }
.wh-qcard.wh-in { opacity: 1; transform: translateY(0); }
.wh-qcard:nth-child(1) { transition-delay: 0s; }
.wh-qcard:nth-child(2) { transition-delay: 0.05s; }
.wh-qcard:nth-child(3) { transition-delay: 0.10s; }
.wh-qcard:nth-child(4) { transition-delay: 0.15s; }
.wh-qcard:nth-child(5) { transition-delay: 0.20s; }

/* SSR fallback */
@media (scripting: none) { .wh-qcard { opacity: 1; transform: none; } }
</style>
