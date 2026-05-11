<!-- Movio AI v6.0 — 创作页：顶部标签 + 输入区 + 工具卡片宫格 -->
<template>
  <div class="wc">
    <!-- ═══ 顶部横向标签栏 ═══ -->
    <div class="wc-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="wc-tab"
        :class="{ sel: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- ═══ 输入区 ═══ -->
    <div class="wc-input">
      <textarea
        v-model="prompt"
        class="wc-textarea"
        :placeholder="activeTabPlaceholder"
        rows="3"
        @keydown.enter.exact.prevent="handleSubmit"
      ></textarea>
      <div class="wc-input-actions">
        <span class="wc-hint">{{ activeTabHint }}</span>
        <button class="wc-submit" :disabled="!prompt.trim()" @click="handleSubmit">
          {{ $t('workspace.start_create') }} →
        </button>
      </div>
    </div>

    <!-- ═══ 当前标签下的工具卡片宫格 ═══ -->
    <div v-if="loading" class="wc-loading">
      <div class="spinner"></div>
      <p>{{ $t('workspace.loading_tools') }}</p>
    </div>
    <div v-else class="wc-section">
      <div class="wc-sec-hd">
        <h3 class="wc-sec-title">{{ activeTabLabel }} · {{ $t('workspace.creation_tools') }}</h3>
        <button class="wc-sec-more" @click="go(allCardsRoute)">{{ $t('workspace.view_all') }} →</button>
      </div>
      <div class="wc-grid">
        <div
          v-for="card in activeCards"
          :key="card.id"
          class="wc-card"
          @click="go(card.route)"
        >
          <div class="wc-card-icon">{{ card.icon }}</div>
          <h4 class="wc-card-title">{{ card.title }}</h4>
          <p class="wc-card-desc">{{ card.desc }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
type Card = { id: string; category: string; icon: string; title: string; desc: string; route: string; order: number; visible: boolean }

definePageMeta({ layout: 'workspace' })
const router = useRouter()

const prompt = ref('')
const activeTab = ref('')
const loading = ref(true)

const tabs = ref<{ key: string; label: string }[]>([])
const cardData = ref<Record<string, Card[]>>({})
const { t } = useI18n()

const CATEGORY_ROUTES: Record<string, string> = {
  video: '/work/video', image: '/work/image', detail: '/work/detail-page',
  copywrite: '/work/copywriting', digital: '/work/digital-human',
}

function getDefaultCards(): Record<string, Card[]> {
  const fromI18n = t('workspace.default_tool_cards') as Record<string, Card[]>
  if (fromI18n && typeof fromI18n === 'object' && Object.keys(fromI18n).length) return fromI18n
  // Hard fallback: minimal tool set per category
  return {
    video: [{ id:'v1', category:'video', icon:'🎥', title:t('workspace.creation_tabs.video'), desc:'AI powered video generation', route:'/work/video', order:1, visible:true }],
    image: [{ id:'i1', category:'image', icon:'🖼', title:t('workspace.creation_tabs.image'), desc:'AI powered image creation', route:'/work/image', order:1, visible:true }],
    detail: [{ id:'d1', category:'detail', icon:'📄', title:t('workspace.creation_tabs.detail'), desc:'Detail page design', route:'/work/detail-page', order:1, visible:true }],
    copywrite: [{ id:'c1', category:'copywrite', icon:'✍️', title:t('workspace.creation_tabs.copywrite'), desc:'AI copywriting', route:'/work/copywriting', order:1, visible:true }],
    digital: [{ id:'dh1', category:'digital', icon:'🤖', title:t('workspace.creation_tabs.digital'), desc:'Digital human videos', route:'/work/digital-human', order:1, visible:true }],
  }
}

onMounted(async () => {
  try {
    const cfg: any = await $fetch('/api/site-config/public')
    if (cfg?.workspace_cards && Array.isArray(cfg.workspace_cards)) {
      const cards: Card[] = cfg.workspace_cards.filter((c: Card) => c.visible !== false)
      // 提取唯一 category 作为 tabs
      const seen = new Set<string>()
      const cats: { key: string; label: string }[] = []
      cards.forEach((c: Card) => {
        if (!seen.has(c.category)) {
          seen.add(c.category)
          const labelKey = `workspace.creation_tabs.${c.category}`
          cats.push({ key: c.category, label: t(labelKey) !== labelKey ? t(labelKey) : c.category })
        }
      })
      // 分组 cards
      const groups: Record<string, Card[]> = {}
      cards.forEach((c: Card) => {
        if (!groups[c.category]) groups[c.category] = []
        groups[c.category].push(c)
      })
      const tabKeys = ["video", "image", "detail", "copywrite", "digital"]
      tabs.value = cats.length > 0
        ? cats.map(c => ({ key: c.key, label: c.label }))
        : tabKeys.map(key => ({ key, label: t(`workspace.creation_tabs.${key}`) }))
      cardData.value = Object.keys(groups).length > 0 ? groups : getDefaultCards()
    } else {
      throw new Error('empty')
    }
  } catch (e: any) {
    console.error('[创作页] 配置加载失败，使用默认卡片', e.message)
    const tabKeys = ["video", "image", "detail", "copywrite", "digital"]
    tabs.value = tabKeys.map(key => ({ key, label: t(`workspace.creation_tabs.${key}`) }))
    cardData.value = getDefaultCards()
  } finally {
    loading.value = false
  }
  if (tabs.value.length > 0 && !activeTab.value) {
    activeTab.value = tabs.value[0].key
  }

  // Entrance animations for tool cards
  if (process.client && window.IntersectionObserver) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('wc-in')
      })
    }, { threshold: 0.08 })
    setTimeout(() => {
      document.querySelectorAll('.wc-card').forEach(el => obs.observe(el))
    }, 150)
    // Safety: reveal all cards after 2.5s
    setTimeout(() => {
      document.querySelectorAll('.wc-card').forEach(el => el.classList.add('wc-in'))
    }, 2500)
  }
})

function go(path: string) { router.push(path) }

const activeTabLabel = computed(() => tabs.value.find(t => t.key === activeTab.value)?.label || '')

const activeTabPlaceholder = computed(() => {
  const key = `workspace.creation_placeholder_${activeTab.value}` as string
  const fallback = t('workspace.creation_placeholder_default')
  return t(key) !== key ? t(key) : fallback
})
const activeTabHint = computed(() => {
  const key = `workspace.creation_hint_${activeTab.value}` as string
  return t(key) !== key ? t(key) : ''
})

const activeCards = computed(() => cardData.value[activeTab.value] || Object.values(cardData.value)[0] || [])

const allCardsRoute = computed(() => CATEGORY_ROUTES[activeTab.value] || '/workspace/creation')

async function handleSubmit() {
  if (!prompt.value.trim()) return
  const target = CATEGORY_ROUTES[activeTab.value] || '/work/image'
  router.push({ path: target, query: { prompt: prompt.value } })
}
</script>

<style scoped>
.wc { max-width: 1100px; margin: 0 auto; padding: 24px 28px; }

/* ═══ Tabs ═══ */
.wc-tabs { display: flex; gap: 4px; margin-bottom: 20px; flex-wrap: wrap; }
.wc-tab {
  padding: 7px 16px; border-radius: 8px; font-size: 13px; background: none; border: none;
  color: var(--tx2, #6b6b70); cursor: pointer; transition: background 0.15s, color 0.15s;
}
.wc-tab:hover { background: rgba(0,0,0,0.04); color: var(--tx, #171717); }
.wc-tab:focus-visible { outline: 2px solid var(--brand, #5b5fe3); outline-offset: 2px; border-radius: 4px; }
.wc-tab.sel { background: var(--brand, #5b5fe3); color: #fff; }

/* ═══ Input ═══ */
.wc-input { background: #fff; border-radius: 14px; padding: 18px; border: 1px solid var(--brd, #ebebea); box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-bottom: 28px; }
.wc-textarea {
  width: 100%; border: none; resize: none; font-size: 14px; line-height: 1.6; color: var(--tx, #171717);
  font-family: inherit; outline: none; background: none;
}
.wc-textarea:focus-visible {
  outline: 2px solid var(--brand, #5b5fe3);
  outline-offset: 2px;
  border-radius: 4px;
}
.wc-textarea::placeholder { color: var(--tx3, #9d9da3); }
.wc-input-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; }
.wc-hint { font-size: 11px; color: var(--tx3, #9d9da3); }
.wc-submit {
  padding: 8px 20px; border-radius: 8px; font-size: 13px; font-weight: 500; border: none;
  background: var(--brand, #5b5fe3); color: #fff; cursor: pointer; transition: opacity 0.15s, transform 0.15s;
}
.wc-submit:hover { opacity: 0.85; transform: scale(1.02); }
.wc-submit:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

/* ═══ Grid ═══ */
.wc-section { }
.wc-sec-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.wc-sec-title { font-size: 14px; font-weight: 500; color: var(--tx, #171717); }
.wc-sec-more { font-size: 12px; color: var(--tx3, #9d9da3); background: none; border: none; cursor: pointer; }
.wc-sec-more:hover { color: var(--tx, #171717); }
.wc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.wc-card {
  background: #fff; border-radius: 11px; padding: 18px 16px; border: 1px solid var(--brd, #ebebea);
  cursor: pointer; transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
}
.wc-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); border-color: #d4d4d4; }
.wc-card:focus-visible { outline: 2px solid var(--brand, #5b5fe3); outline-offset: 2px; }
.wc-card-icon { font-size: 24px; margin-bottom: 8px; }
.wc-card-title { font-size: 13px; font-weight: 500; color: var(--tx, #171717); margin-bottom: 4px; }
.wc-card-desc { font-size: 12px; color: var(--tx3, #9d9da3); line-height: 1.4; }

@media (max-width: 1000px) { .wc-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 700px) { .wc-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 480px) { .wc-grid { grid-template-columns: 1fr; } }

.wc-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 0; color: var(--tx2, #6b6b70); font-size: 13px; gap: 12px; }
.spinner { width: 32px; height: 32px; border: 3px solid var(--brd, #ebebea); border-top-color: var(--brand, #5b5fe3); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Dark mode */
:root[data-theme="dark"] .wc-input, :root.dark .wc-input { background: #1a1a1a; border-color: #2a2a2a; }
:root[data-theme="dark"] .wc-textarea, :root.dark .wc-textarea { color: #e5e5e5; }
:root[data-theme="dark"] .wc-tab, :root.dark .wc-tab { color: #9d9da3; }
:root[data-theme="dark"] .wc-tab:hover, :root.dark .wc-tab:hover { background: rgba(255,255,255,0.06); color: #e5e5e5; }
:root[data-theme="dark"] .wc-card, :root.dark .wc-card { background: #1a1a1a; border-color: #2a2a2a; }
:root[data-theme="dark"] .wc-card-title, :root.dark .wc-card-title,
:root[data-theme="dark"] .wc-sec-title, :root.dark .wc-sec-title { color: #e5e5e5; }

/* Entrance animations */
.wc-card { opacity: 0; transform: translateY(20px); transition: opacity 0.45s cubic-bezier(0.22, 1, 0.36, 1), transform 0.45s cubic-bezier(0.22, 1, 0.36, 1); }
.wc-card.wc-in { opacity: 1; transform: translateY(0); }
.wc-card:nth-child(1) { transition-delay: 0s; }
.wc-card:nth-child(2) { transition-delay: 0.04s; }
.wc-card:nth-child(3) { transition-delay: 0.08s; }
.wc-card:nth-child(4) { transition-delay: 0.12s; }
.wc-card:nth-child(5) { transition-delay: 0.16s; }
.wc-card:nth-child(6) { transition-delay: 0.20s; }
.wc-card:nth-child(7) { transition-delay: 0.24s; }
.wc-card:nth-child(8) { transition-delay: 0.28s; }
@media (scripting: none) { .wc-card { opacity: 1; transform: none; } }
</style>
