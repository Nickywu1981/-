<template>
  <div class="marketplace-page">
    <div class="page-header">
      <div>
        <h1>提示词模板市场</h1>
        <p class="subtitle">精选优质模板，一键套用生成</p>
      </div>
      <div class="header-actions">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input v-model="search" placeholder="搜索模板..." @input="onSearch" />
        </div>
        <select v-model="category" class="filter-select" @change="onFilter">
          <option value="">全部分类</option>
          <option value="ecommerce">电商主图</option>
          <option value="scene">场景生成</option>
          <option value="portrait">人像精修</option>
          <option value="video">视频脚本</option>
          <option value="copywriting">文案生成</option>
          <option value="social">社交媒体</option>
        </select>
      </div>
    </div>

    <LoadingSkeleton v-if="loading" type="card" :rows="3" />

    <div v-else-if="error" class="error-state">
      <span class="error-icon">⚠️</span>
      <p>{{ error }}</p>
      <button class="btn-outline" @click="fetchData">重试</button>
    </div>

    <div v-else class="template-grid">
      <div v-for="tpl in list" :key="tpl.id" class="template-card" @click="previewTemplate(tpl)">
        <div class="card-preview">
          <div class="preview-bg" :style="{ background: tpl.color || gradFromName(tpl.name) }">
            <span class="preview-icon">{{ tpl.icon || '✨' }}</span>
          </div>
          <span class="badge-cat">{{ catLabel(tpl.category) }}</span>
          <span v-if="tpl.is_hot" class="badge-hot">🔥 热门</span>
          <span v-if="tpl.is_new" class="badge-new">NEW</span>
        </div>
        <div class="card-body">
          <h3>{{ tpl.name }}</h3>
          <p class="card-desc">{{ tpl.description }}</p>
          <div class="card-tags">
            <span v-for="tag in (tpl.tags || [])" :key="tag" class="tag">{{ tag }}</span>
          </div>
        </div>
        <div class="card-footer">
          <span class="usage-count">{{ tpl.usage_count || 0 }} 次使用</span>
          <button class="btn-use" @click.stop="useTemplate(tpl)">使用模板</button>
        </div>
      </div>
    </div>

    <Pagination v-if="total > pageSize" :page="page" :total="total" :page-size="pageSize"
      @update:page="(p: number) => { page = p; fetchData() }" />

    <!-- Preview Modal -->
    <div v-if="previewing" class="modal-overlay" @click.self="previewing = null">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3>{{ previewing.name }}</h3>
          <button class="btn-close" @click="previewing = null">✕</button>
        </div>
        <div class="preview-meta">
          <span class="meta-item">分类：{{ catLabel(previewing.category) }}</span>
          <span class="meta-item">使用：{{ previewing.usage_count || 0 }} 次</span>
        </div>
        <div class="preview-content">
          <label class="field-label">提示词模板</label>
          <pre class="prompt-preview">{{ previewing.prompt_template }}</pre>
          <label class="field-label">使用说明</label>
          <p class="usage-note">{{ previewing.usage_note || '根据实际场景替换模板中的变量' }}</p>
        </div>
        <div class="modal-actions">
          <button class="btn-outline" @click="previewing = null">关闭</button>
          <button class="btn-primary" @click="useTemplate(previewing!)">使用此模板</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

const toast = useToast()
const list: Ref<any[]> = ref([])
const loading = ref(true)
const error = ref('')
const page = ref(1)
const total = ref(0)
const pageSize = ref(12)
const search = ref('')
const category = ref('')
const previewing: Ref<any | null> = ref(null)
let searchTimer: ReturnType<typeof setTimeout> | null = null

const catLabels: Record<string, string> = {
  ecommerce: '电商主图', scene: '场景生成', portrait: '人像精修',
  video: '视频脚本', copywriting: '文案生成', social: '社交媒体',
}

function catLabel(c: string) { return catLabels[c] || c }
function gradFromName(name: string) {
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const hues = ['#7C3AED', '#3B82F6', '#EC4899', '#F59E0B', '#22C55E', '#06B6D4']
  return `linear-gradient(135deg, ${hues[hash % hues.length]}, ${hues[(hash + 1) % hues.length]})`
}

async function fetchData() {
  loading.value = true; error.value = ''
  try {
    const params = new URLSearchParams({ page: String(page.value), pageSize: String(pageSize.value) })
    if (category.value) params.set('category', category.value)
    if (search.value) params.set('keyword', search.value)
    const res: any = await $fetch(`/api/prompts?${params}`)
    list.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch (e: any) {
    error.value = e.message || '加载失败'
    toast.error(error.value)
  } finally { loading.value = false }
}

function previewTemplate(tpl: any) { previewing.value = tpl }

function useTemplate(tpl: any) {
  previewing.value = null
  const routes: Record<string, string> = {
    ecommerce: '/work/main-image', scene: '/work/scene',
    portrait: '/work/retouch', video: '/work/video',
    copywriting: '/work/script-gen', social: '/work/main-image',
  }
  const target = routes[tpl.category] || '/workspace'
  navigateTo(`${target}?templateId=${tpl.id}`)
  toast.success(`已加载模板：${tpl.name}`)
}

function onSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; fetchData() }, 300)
}

function onFilter() { page.value = 1; fetchData() }

onMounted(() => fetchData())
onBeforeUnmount(() => { if (searchTimer) clearTimeout(searchTimer) })
</script>

<style scoped>
.marketplace-page { max-width: 1200px; margin: 0 auto; padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
h1 { font-size: 24px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
.subtitle { font-size: 13px; color: var(--text-secondary); }
.header-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.search-box { display: flex; align-items: center; background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 0 10px; transition: border-color var(--transition-fast); }
.search-box:focus-within { border-color: var(--brand); }
.search-box input { border: none; outline: none; padding: 8px 6px; background: transparent; color: var(--text-primary); font-size: 13px; width: 180px; }
.search-icon { font-size: 14px; opacity: 0.5; }
.filter-select { padding: 8px 12px; border: 1px solid var(--border-light); border-radius: var(--radius-md); background: var(--bg-card); color: var(--text-primary); font-size: 13px; cursor: pointer; }

.template-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.template-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-lg); overflow: hidden; cursor: pointer; transition: all var(--transition-fast); }
.template-card:hover { border-color: var(--brand); transform: translateY(-2px); box-shadow: var(--shadow-card); }
.card-preview { height: 120px; display: flex; align-items: center; justify-content: center; position: relative; }
.preview-bg { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.preview-icon { font-size: 36px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2)); }
.badge-cat { position: absolute; top: 8px; left: 8px; padding: 2px 8px; background: rgba(0,0,0,0.5); color: #fff; border-radius: 10px; font-size: 11px; }
.badge-hot { position: absolute; top: 8px; right: 8px; padding: 2px 8px; background: #F59E0B; color: #fff; border-radius: 10px; font-size: 11px; }
.badge-new { position: absolute; bottom: 8px; right: 8px; padding: 2px 8px; background: var(--brand); color: #fff; border-radius: 10px; font-size: 11px; }

.card-body { padding: 14px 16px; }
.card-body h3 { font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
.card-desc { font-size: 12px; color: var(--text-secondary); margin-bottom: 8px; line-height: 1.4; }
.card-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.tag { padding: 2px 8px; background: var(--bg-secondary); color: var(--text-muted); border-radius: var(--radius-sm); font-size: 11px; }

.card-footer { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; border-top: 1px solid var(--border-light); }
.usage-count { font-size: 11px; color: var(--text-muted); }
.btn-use { padding: 6px 14px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); font-size: 12px; cursor: pointer; transition: opacity var(--transition-fast); }
.btn-use:hover { opacity: 0.9; }

.error-state { text-align: center; padding: 60px 20px; }
.error-icon { font-size: 48px; }
.error-state p { color: var(--text-muted); margin: 12px 0 20px; }

.btn-outline { padding: 8px 20px; border: 1px solid var(--border-light); border-radius: var(--radius-md); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 13px; }
.btn-outline:hover { border-color: var(--brand); }
.btn-primary { padding: 8px 20px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: 13px; font-weight: 500; }
.btn-primary:hover { opacity: 0.9; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: var(--bg-card); border-radius: var(--radius-xl); padding: 24px; width: 90%; max-width: 560px; box-shadow: var(--shadow-modal); max-height: 80vh; overflow-y: auto; }
.modal-lg { max-width: 640px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.modal-header h3 { font-size: 18px; font-weight: 600; color: var(--text-primary); }
.btn-close { border: none; background: none; font-size: 18px; cursor: pointer; color: var(--text-muted); }
.preview-meta { display: flex; gap: 16px; margin-bottom: 16px; }
.meta-item { font-size: 12px; color: var(--text-secondary); }
.field-label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 4px; font-weight: 500; }
.prompt-preview { background: var(--bg-secondary); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 14px; font-size: 13px; line-height: 1.6; color: var(--text-primary); white-space: pre-wrap; margin-bottom: 14px; max-height: 200px; overflow-y: auto; }
.usage-note { font-size: 13px; color: var(--text-secondary); margin-bottom: 20px; line-height: 1.5; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; }

@media (max-width: 640px) {
  .marketplace-page { padding: 16px; }
  .search-box input { width: 130px; }
  .template-grid { grid-template-columns: 1fr; }
}
</style>
