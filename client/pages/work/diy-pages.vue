<template>
  <div class="diy-page">
    <h1>DIY 模板库</h1>
    <p class="subtitle">30+ 行业模板，一键创建电商页面</p>

    <div class="filter-bar">
      <select v-model="selectedIndustry" class="sel" @change="loadTemplates">
        <option value="">全部行业</option>
        <option v-for="ind in industries" :key="ind" :value="ind">{{ ind }}</option>
      </select>
      <select v-model="selectedPageType" class="sel" @change="loadTemplates">
        <option value="">全部类型</option>
        <option value="mobile">移动端</option>
        <option value="pc">PC端</option>
        <option value="h5">H5</option>
      </select>
      <input v-model="keyword" class="input-search" placeholder="搜索模板..." @keyup.enter="loadTemplates" />
    </div>

    <LoadingSkeleton v-if="loading" type="card" :rows="3" />
    <div v-else-if="templates.length" class="diy-grid">
      <div v-for="tpl in templates" :key="tpl.id" class="diy-card" @click="useTemplate(tpl)">
        <div class="diy-card__preview" :style="{ background: tpl.thumbnail ? `url(${tpl.thumbnail}) center/cover` : '#F5F3FF' }">
          <span v-if="!tpl.thumbnail" class="diy-card__icon">📄</span>
          <span v-if="tpl.is_official" class="diy-card__badge">官方</span>
        </div>
        <div class="diy-card__info">
          <div class="diy-card__name">{{ tpl.title }}</div>
          <div class="diy-card__tags">
            <span class="tag">{{ tpl.industry }}</span>
            <span class="tag">{{ tpl.page_type }}</span>
          </div>
          <div class="diy-card__desc">{{ tpl.description || '暂无描述' }}</div>
          <div class="diy-card__meta">使用 {{ tpl.use_count || 0 }} 次</div>
        </div>
      </div>
    </div>
    <div v-else class="empty">暂无匹配模板</div>

    <div class="diy-create">
      <button class="btn btn-outline" @click="createNew">+ 创建空白页面</button>
    </div>
  </div>
</template>

<script setup lang="ts">
const templates = ref<any[]>([])
const industries = ref<string[]>([])
const loading = ref(true)
const selectedIndustry = ref('')
const selectedPageType = ref('')
const keyword = ref('')
const toast = useToast()
const router = useRouter()

onMounted(async () => {
  await Promise.all([loadIndustries(), loadTemplates()])
})

async function loadIndustries() {
  try {
    const data: any = await $fetch('/api/diy/templates/industries', { credentials: 'include' })
    industries.value = data?.data || []
  } catch (e: any) { toast.warn(e?.data?.msg || '加载行业失败') }
}

async function loadTemplates() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (selectedIndustry.value) params.set('industry', selectedIndustry.value)
    if (selectedPageType.value) params.set('pageType', selectedPageType.value)
    if (keyword.value) params.set('keyword', keyword.value)
    const qs = params.toString()
    const data: any = await $fetch(`/api/diy/templates${qs ? '?' + qs : ''}`, { credentials: 'include' })
    templates.value = data?.data?.list || []
  } catch (e: any) { toast.error(e.data?.msg || '加载模板失败') }
  loading.value = false
}

function useTemplate(tpl: any) { router.push(`/diy/editor?templateId=${tpl.id}`) }
function createNew() { router.push('/diy/editor') }
</script>

<style scoped>
.diy-page { max-width: 1200px; margin: 0 auto; padding: 40px 24px; }
h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
.subtitle { color: var(--text-secondary); margin-bottom: 24px; }

.filter-bar { display: flex; gap: 10px; margin-bottom: 24px; flex-wrap: wrap; }
.sel { padding: 8px 14px; border: 1px solid var(--border-light); border-radius: 8px; font-size: 13px; background: var(--bg-card); color: var(--text-primary); outline: none; }
.sel:focus { border-color: var(--brand); }
.input-search { flex: 1; min-width: 160px; max-width: 280px; padding: 8px 14px; border: 1px solid var(--border-light); border-radius: 8px; font-size: 13px; background: var(--bg-card); color: var(--text-primary); outline: none; }
.input-search:focus { border-color: var(--brand); }

.diy-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
.diy-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 12px; overflow: hidden; cursor: pointer; transition: all .2s; }
.diy-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.1); transform: translateY(-2px); }
.diy-card__preview { height: 140px; display: flex; align-items: center; justify-content: center; position: relative; }
.diy-card__icon { font-size: 48px; }
.diy-card__badge { position: absolute; top: 8px; right: 8px; padding: 2px 8px; border-radius: 4px; background: var(--brand); color: #fff; font-size: 11px; font-weight: 600; }
.diy-card__info { padding: 16px; }
.diy-card__name { font-weight: 600; margin-bottom: 6px; }
.diy-card__tags { display: flex; gap: 4px; margin-bottom: 8px; }
.tag { padding: 1px 8px; border-radius: 4px; background: var(--bg-hover); font-size: 11px; color: var(--text-secondary); }
.diy-card__desc { font-size: 13px; color: var(--text-muted); margin-bottom: 6px; line-height: 1.4; }
.diy-card__meta { font-size: 11px; color: var(--text-muted); }
.empty { text-align: center; padding: 60px; color: var(--text-muted); }
.diy-create { margin-top: 32px; text-align: center; }
.btn { padding: 12px 32px; border-radius: var(--radius-md); font-size: 15px; cursor: pointer; font-weight: 600; border: none; }
.btn-outline { background: var(--bg-card); border: 2px solid var(--border); color: var(--text-primary); }
.btn-outline:hover { border-color: var(--brand); color: var(--brand); }
</style>
