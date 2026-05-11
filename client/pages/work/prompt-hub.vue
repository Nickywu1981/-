<template>
  <div class="prompt-hub-page">
    <div class="page-header">
      <div>
        <h1>提示词工坊</h1>
        <p class="subtitle">AI 智能推荐 + 150+ 精品模板，一键填写即出图</p>
      </div>
    </div>

    <!-- 智能推荐区 -->
    <div class="section" v-if="recommendations.length > 0">
      <div class="section-header">
        <h2>为你推荐</h2>
        <span class="badge">AI 协同过滤</span>
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
            <span>{{ t.usage_count || 0 }} 次使用</span>
            <button class="btn-sm" @click.stop="useTemplate(t)">立即使用</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 分类筛选 -->
    <div class="section">
      <div class="filter-bar">
        <button v-for="cat in categories" :key="cat" class="filter-chip" :class="{ active: activeCat === cat }" @click="activeCat = cat">
          {{ cat === 'all' ? '全部' : cat }}
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
          <span>{{ t.usage_count || 0 }} 次使用</span>
          <button class="btn-sm" @click.stop="useTemplate(t)">立即使用</button>
        </div>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <div v-if="detail" class="modal-overlay" @click.self="detail = null">
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ detail.title }}</h2>
          <button class="modal-close" @click="detail = null" aria-label="关闭">×</button>
        </div>
        <span class="modal-category">{{ detail.category }}</span>
        <pre class="modal-content-text">{{ detail.content }}</pre>
        <div class="modal-vars" v-if="detail.variables?.length">
          <h4>填写参数</h4>
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
            <span>评分：</span>
            <button v-for="s in 5" :key="s" class="star-btn" :class="{ active: myRating >= s }" @click="doRate(s)">{{ myRating >= s ? '★' : '☆' }}</button>
            <span v-if="detail.rating_count" class="rating-info">({{ detail.avg_score }} / {{ detail.rating_count }}评)</span>
          </div>
          <button class="btn-primary" @click="doFill">生成预览</button>
        </div>
      </div>
    </div>

    <!-- 使用历史 -->
    <div class="section">
      <div class="section-header">
        <h2>使用历史</h2>
      </div>
      <div v-if="history.length === 0" class="empty-hint">暂无使用记录</div>
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

const fetchAll = async () => {
  loading.value = true
  try {
    const [rec, temps, hist] = await Promise.all([
      $fetch('/api/prompts/recommendations', { credentials: 'include' }).catch((err: any) => { toast.error('推荐加载失败'); if (import.meta.dev) console.warn('[prompt-hub] 推荐加载失败', err?.message || err); return { list: [] } }),
      $fetch('/api/prompts?page=1&pageSize=60', { credentials: 'include' }).catch((err: any) => { toast.error('模板加载失败'); if (import.meta.dev) console.warn('[prompt-hub] 模板加载失败', err?.message || err); return { list: [] } }),
      $fetch('/api/prompts/usage-history?page=1&pageSize=10', { credentials: 'include' }).catch((err: any) => { toast.error('历史加载失败'); if (import.meta.dev) console.warn('[prompt-hub] 历史加载失败', err?.message || err); return { list: [] } }),
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
  // Fetch current rating
  $fetch(`/api/prompts/${t.id}/rating`, { credentials: 'include' }).then((r: any) => {
    if (r.myScore) myRating.value = r.myScore
    detail.value.avg_score = r.avgScore
    detail.value.rating_count = r.ratingCount
  }).catch(() => toast.error('加载失败'))
}

const useTemplate = (t: any) => {
  $fetch(`/api/prompts/${t.id}/use`, { method: 'POST', body: { modelType: 'text' }, credentials: 'include' }).catch(() => toast.error('加载失败'))
  openDetail(t)
}

const doRate = async (score: number) => {
  if (!detail.value) return
  try {
    await $fetch(`/api/prompts/${detail.value.id}/rate`, { method: 'POST', body: { score }, credentials: 'include' })
    myRating.value = score
    fetchAll()
  } catch { toast.warn('评分失败') }
}

const toast = useToast()
const doFill = async () => {
  if (!detail.value) return
  try {
    const r = await $fetch(`/api/prompts/templates/${detail.value.id}/fill`, {
      method: 'POST',
      body: { variables: fillValues.value },
    })
    toast.success((r as any).filled || '生成成功')
    detail.value = null
  } catch (e: any) { toast.error(e?.data?.msg || e.message || '生成失败') }
}

onMounted(fetchAll)
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>
