<template>
  <div class="prompt-hub-page">
    <div class="page-header">
      <div>
        <h1>{{ $t('work_pages.prompt_hub.title') }}</h1>
        <p class="subtitle">{{ $t('work_pages.prompt_hub.subtitle') }}</p>
      </div>
      <div class="header-tabs">
        <button :class="['header-tab', { active: activeTab === 'official' }]" @click="switchTab('official')">{{ $t('work_pages.prompt_hub.tab_official') }}</button>
        <button :class="['header-tab', { active: activeTab === 'my' }]" @click="switchTab('my')">{{ $t('work_pages.prompt_hub.tab_my') }}</button>
      </div>
    </div>

    <!-- 智能推荐区 -->
    <div class="section" v-if="recommendations.length > 0">
      <div class="section-header">
        <h2>{{ $t('work_pages.prompt_hub.ai_recommend') }}</h2>
        <span class="badge">{{ $t('work_pages.prompt_hub.ai_collaborative') }}</span>
      </div>
      <div class="prompt-grid">
        <div v-for="t in recommendations" :key="t.id" class="prompt-card" @click="openDetail(t)">
          <div class="card-top">
            <span class="card-category">{{ t.category }}</span>
            <span class="card-stars" v-if="t.avg_score">★ {{ t.avg_score.toFixed(1) }}</span>
          </div>
          <h3 class="card-title">{{ t.title }}</h3>
          <p class="card-desc">{{ t.description || t.content?.slice(0, 80) }}</p>
          <div class="card-meta">
            <span>{{ t.usage_count || 0 }} {{ $t('work_pages.prompt_hub.usage_count') }}</span>
            <div class="card-btns">
              <button class="btn-sm" @click.stop="useTemplate(t)">{{ $t('work_pages.prompt_hub.use_btn') }}</button>
              <button class="btn-sm outline" @click.stop="copyTemplate(t)">{{ $t('work_pages.prompt_hub.copy_btn') }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 分类筛选 -->
    <div class="section">
      <div class="filter-bar">
        <button v-for="cat in categories" :key="cat" class="filter-chip" :class="{ active: activeCat === cat }" @click="activeCat = cat">
          {{ cat === 'all' ? $t('work_pages.prompt_hub.filter_all') : cat }}
        </button>
      </div>
    </div>

    <!-- 模板列表 -->
    <LoadingSkeleton v-if="loading" type="card" :rows="3" />
    <div v-else class="prompt-grid">
      <div v-for="t in filtered" :key="t.id" class="prompt-card" @click="openDetail(t)">
        <div class="card-top">
          <span class="card-category">{{ t.category }}</span>
          <span class="card-stars" v-if="t.avg_score">★ {{ Number(t.avg_score).toFixed(1) }}</span>
        </div>
        <h3 class="card-title">{{ t.title }}</h3>
        <p class="card-desc">{{ t.description || t.content?.slice(0, 80) }}</p>
        <div class="card-meta">
          <span>{{ t.usage_count || 0 }} {{ $t('work_pages.prompt_hub.usage_count') }}</span>
          <button class="btn-sm" @click.stop="useTemplate(t)">{{ $t('work_pages.prompt_hub.use_btn') }}</button>
        </div>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <div v-if="detail" class="modal-overlay" @click.self="detail = null" @keydown.escape="detail = null">
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ detail.title }}</h2>
          <button class="modal-close" @click="detail = null" :aria-label="$t('work_pages.prompt_hub.close')">×</button>
        </div>
        <span class="modal-category">{{ detail.category }}</span>
        <pre class="modal-content-text">{{ detail.content }}</pre>
        <div class="modal-vars" v-if="detail.variables?.length">
          <h4>{{ $t('work_pages.prompt_hub.fill_params') }}</h4>
          <div v-for="v in detail.variables" :key="v.name" class="form-group">
            <label>{{ v.label || v.name }}</label>
            <input v-if="v.type !== 'select'" v-model="fillValues[v.name]" class="input" :placeholder="v.placeholder || v.label" maxlength="500" />
            <select v-else v-model="fillValues[v.name]" class="input">
              <option v-for="o in v.options" :key="o" :value="o">{{ o }}</option>
            </select>
          </div>
        </div>
        <div class="modal-actions">
          <div class="rating-row">
            <span>{{ $t('work_pages.prompt_hub.rating_label') }}</span>
            <button v-for="s in 5" :key="s" class="star-btn" :class="{ active: myRating >= s }" @click="doRate(s)">{{ myRating >= s ? '★' : '☆' }}</button>
            <span v-if="detail.rating_count" class="rating-info">({{ detail.avg_score }} / {{ detail.rating_count }}{{ $t('work_pages.prompt_hub.rating_count') }})</span>
          </div>
          <button class="btn-primary" @click="doFill">{{ $t('work_pages.prompt_hub.generate_preview') }}</button>
        </div>
      </div>
    </div>

    <!-- 使用历史 -->
    <div class="section">
      <div class="section-header">
        <h2>{{ $t('work_pages.prompt_hub.history_title') }}</h2>
      </div>
      <div v-if="history.length === 0" class="empty-hint">{{ $t('work_pages.prompt_hub.no_history') }}</div>
      <div v-else class="history-list">
        <div v-for="h in history" :key="h.id" class="history-item">
          <span class="h-type">{{ h.template_title }}</span>
          <span class="h-date">{{ formatDate(h.create_time) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const activeCat = ref('all')
const activeTab = ref('official')
const loading = ref(true)
const detail = ref<any>(null)
const myRating = ref(0)
const fillValues = ref<Record<string, string>>({})
const recommendations = ref<any[]>([])
const templates = ref<any[]>([])
const history = ref<any[]>([])

const categories = computed(() => {
  const cats = new Set(templates.value.map((t: any) => t.category))
  return ['all', ...Array.from(cats).filter(Boolean)]
})

const filtered = computed(() => {
  if (activeCat.value === 'all') return templates.value
  return templates.value.filter((t: any) => t.category === activeCat.value)
})

import { formatDate } from '@/utils/format'
const { t } = useI18n()

const fetchAll = async () => {
  loading.value = true
  try {
    const [rec, temps, hist] = await Promise.all([
      $fetch('/api/prompts/recommendations', { credentials: 'include' }).catch((err: any) => { toast.error(t('common.failed_load_recommendations')); if (import.meta.dev) console.warn('[prompt-hub] load rec failed', err?.message || err); return { list: [] } }),
      $fetch('/api/prompts?page=1&pageSize=60', { credentials: 'include' }).catch((err: any) => { toast.error(t('common.failed_load_templates')); if (import.meta.dev) console.warn('[prompt-hub] load templates failed', err?.message || err); return { list: [] } }),
      $fetch('/api/prompts/usage-history?page=1&pageSize=10', { credentials: 'include' }).catch((err: any) => { toast.error(t('common.failed_load_history')); if (import.meta.dev) console.warn('[prompt-hub] load history failed', err?.message || err); return { list: [] } }),
    ])
    recommendations.value = (rec as any).list || []
    templates.value = (temps as any).list || []
    history.value = (hist as any).list || []
  } finally {
    loading.value = false
  }
}

const openDetail = (t: any) => {
  detail.value = t
  myRating.value = 0
  fillValues.value = {}
  $fetch(`/api/prompts/${t.id}/rating`, { credentials: 'include' }).then((r: any) => {
    if (r.myScore) myRating.value = r.myScore
    detail.value.avg_score = r.avgScore
    detail.value.rating_count = r.ratingCount
  }).catch(() => toast.error(t('common.loadFail')))
}

const useTemplate = (t: any) => {
  $fetch(`/api/prompts/${t.id}/use`, { method: 'POST', body: { modelType: 'text' }, credentials: 'include' }).catch(() => toast.error(t('common.loadFail')))
  openDetail(t)
}

const doRate = async (score: number) => {
  if (!detail.value) return
  try {
    await $fetch(`/api/prompts/${detail.value.id}/rate`, { method: 'POST', body: { score }, credentials: 'include' })
    myRating.value = score
    fetchAll()
  } catch { toast.warn(t('common.failed_rate')) }
}

const toast = useToast()
const navigateTo = (await import('nuxt/app')).navigateTo

function switchTab(tab: string) {
  activeTab.value = tab
  if (tab === 'my') navigateTo('/work/my-templates')
}

async function copyTemplate(t: any) {
  try {
    const r = await $fetch(`/api/prompts/templates/${t.id}/copy`, { method: 'POST', credentials: 'include' })
    toast.success((r as any).updated ? t('work_pages.prompt_hub.copy_updated') : t('work_pages.prompt_hub.copy_created'))
  } catch (e: any) { toast.error(t('common.failed_copy') + ' : ' +  (e?.data?.msg || e.message)) }
}

const doFill = async () => {
  if (!detail.value) return
  try {
    const r = await $fetch(`/api/prompts/templates/${detail.value.id}/fill`, {
      method: 'POST',
      body: { variables: fillValues.value },
    })
    toast.success((r as any).filled || t('work_pages.prompt_hub.generated'))
    detail.value = null
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || err.message || t('common.failed_generate')) }
}

onMounted(fetchAll)
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.header-tabs { display: flex; gap: 0; margin-top: 12px; }
.header-tab { padding: 6px 18px; border: 1px solid var(--input-border); background: var(--bg-card); color: var(--text-secondary); cursor: pointer; font-size: 13px; transition: all var(--transition-fast); }
.header-tab:first-child { border-radius: var(--radius-sm) 0 0 var(--radius-sm); }
.header-tab:last-child { border-radius: 0 var(--radius-sm) var(--radius-sm) 0; }
.header-tab.active { background: var(--brand); color: var(--text-on-brand); border-color: var(--brand); }
.card-btns { display: flex; gap: 6px; }
.btn-sm.outline { background: transparent; border: 1px solid var(--brand); color: var(--brand); }
.btn-sm.outline:hover { background: var(--brand); color: var(--text-on-brand); }
</style>
