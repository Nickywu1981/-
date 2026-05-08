<template>
  <div class="cut-ecosystem-page">
    <header class="page-header">
      <h1>剪映/CapCut 生态对接</h1>
      <p>一键导出 Movio AI 生成内容到剪映/CapCut 继续编辑</p>
    </header>

    <!-- 平台选择 -->
    <section class="platform-section">
      <div
        v-for="p in platforms"
        :key="p.key"
        :class="['platform-card', { active: activePlatform === p.key }]"
        @click="activePlatform = p.key"
      >
        <div class="platform-icon">{{ p.icon }}</div>
        <div class="platform-name">{{ p.name }}</div>
        <div class="platform-desc">{{ p.desc }}</div>
      </div>
    </section>

    <!-- 画幅选择 -->
    <section class="ratio-section">
      <h3>目标画幅</h3>
      <div class="ratio-options">
        <button
          v-for="r in ratios"
          :key="r.key"
          :class="['ratio-btn', { active: selectedRatio === r.key }]"
          @click="selectedRatio = r.key"
        >
          <span class="ratio-label">{{ r.key }}</span>
          <span class="ratio-desc">{{ r.label }}</span>
        </button>
      </div>
    </section>

    <!-- 作品选择 -->
    <section class="works-section">
      <div class="section-header">
        <h3>选择导出作品</h3>
        <div class="filter-row">
          <select v-model="filterType" @change="loadWorks">
            <option value="">全部类型</option>
            <option v-for="t in taskTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </div>
      </div>

      <div v-if="loading" class="loading-state">加载作品中...</div>

      <div v-else-if="works.length === 0" class="empty-state">
        <div class="empty-icon">📭</div>
        <p>暂无已完成的作品可供导出</p>
        <router-link to="/workspace" class="btn-primary">去创作</router-link>
      </div>

      <div v-else class="works-grid">
        <div
          v-for="w in works"
          :key="w.id"
          :class="['work-card', { selected: selectedIds.includes(w.id) }]"
          @click="toggleWork(w)"
        >
          <div class="work-check">
            <span v-if="selectedIds.includes(w.id)" class="check-mark">&#10003;</span>
          </div>
          <div class="work-thumb">
            <div v-if="w.thumbnail" class="thumb-img" :style="{ backgroundImage: 'url(' + w.thumbnail + ')' }" />
            <div v-else class="thumb-placeholder">{{ w.type === 'video' ? '🎬' : '🖼️' }}</div>
          </div>
          <div class="work-info">
            <div class="work-title">{{ w.title || '未命名' }}</div>
            <div class="work-meta">
              <span :class="['type-tag', w.type]">{{ w.type === 'video' ? '视频' : '图片' }}</span>
              <span class="work-date">{{ formatDate(w.create_time) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="works.length > 0" class="pagination">
        <button :disabled="page <= 1" @click="page--; loadWorks()">上一页</button>
        <span>第 {{ page }} / {{ totalPages }} 页</span>
        <button :disabled="page >= totalPages" @click="page++; loadWorks()">下一页</button>
      </div>
    </section>

    <!-- 项目名称 -->
    <section v-if="selectedIds.length > 0" class="config-section">
      <label>项目名称（可选）</label>
      <input v-model="projectName" class="input" placeholder="输入剪映项目名称" maxlength="100" />
    </section>

    <!-- 操作按钮 -->
    <section class="actions">
      <button
        :disabled="selectedIds.length === 0 || exporting"
        class="btn-primary btn-lg"
        @click="exportDraft('jianying')"
      >
        {{ exporting === 'jianying' ? '导出中...' : '导出为剪映项目' }}
      </button>
      <button
        :disabled="selectedIds.length === 0 || exporting"
        class="btn-secondary btn-lg"
        @click="exportDraft('capcut')"
      >
        {{ exporting === 'capcut' ? '导出中...' : '导出为 CapCut 项目' }}
      </button>
    </section>

    <!-- 导出结果 -->
    <section v-if="draftResult" class="result-section">
      <div class="result-card">
        <h3>导出成功</h3>
        <div class="result-info">
          <div><strong>目标平台:</strong> {{ draftResult.platform === 'jianying' ? '剪映' : 'CapCut' }}</div>
          <div><strong>包含素材:</strong> {{ draftResult.assets.length }} 个</div>
          <div><strong>项目名称:</strong> {{ draftResult.draft.draft_name }}</div>
        </div>
        <div class="result-actions">
          <button class="btn-primary" @click="downloadDraft">下载项目文件 (.json)</button>
          <button class="btn-text" @click="draftResult = null">关闭</button>
        </div>
        <details class="draft-preview">
          <summary>预览项目结构 (JSON)</summary>
          <pre>{{ JSON.stringify(draftResult.draft, null, 2) }}</pre>
        </details>
      </div>
    </section>
  </div>
</template>

<script setup>
const toast = useToast()
const api = useApi()

const activePlatform = ref('jianying')
const selectedRatio = ref('9:16')
const selectedIds = ref([])
const projectName = ref('')
const works = ref([])
const loading = ref(false)
const exporting = ref(null)
const draftResult = ref(null)
const page = ref(1)
const pageSize = 20
const totalPages = ref(1)
const filterType = ref('')

const platforms = [
  { key: 'jianying', name: '剪映', icon: '✂️', desc: '国内专业版，抖音创作者首选' },
  { key: 'capcut', name: 'CapCut', icon: '🌍', desc: '海外版剪映，TikTok/YouTube创作者' },
]

const taskTypes = [
  { value: 'video_gen', label: '视频生成' },
  { value: 'action_migrate', label: '动作迁移' },
  { value: 'digital_human', label: '数字人' },
  { value: 'viral_replicate', label: '爆款复刻' },
  { value: 'live_clip', label: '长视频精剪' },
  { value: 'image_gen', label: '图片生成' },
  { value: 'detail_gen', label: '详情图' },
]

const ratios = ref([])

onMounted(async () => {
  await loadRatios()
  await loadWorks()
})

async function loadRatios() {
  try {
    const res = await api.get('/api/cut-ecosystem/ratios')
    if (res?.code === 200) ratios.value = res.data
  } catch { /* noop */ }
}

async function loadWorks() {
  loading.value = true
  try {
    const params = { page: page.value, pageSize }
    if (filterType.value) params.type = filterType.value
    const res = await api.get('/api/cut-ecosystem/works', { params })
    if (res?.code === 200) {
      works.value = res.data.list || []
      totalPages.value = Math.max(1, Math.ceil((res.data.total || 0) / pageSize))
    }
  } catch (e) {
    toast.error('加载作品失败')
  } finally {
    loading.value = false
  }
}

function toggleWork(work) {
  const idx = selectedIds.value.indexOf(work.id)
  if (idx >= 0) {
    selectedIds.value.splice(idx, 1)
  } else if (selectedIds.value.length < 50) {
    selectedIds.value.push(work.id)
  } else {
    toast.warn('单次最多选择 50 个作品')
  }
}

async function exportDraft(platform) {
  exporting.value = platform
  draftResult.value = null
  try {
    const body = {
      workIds: selectedIds.value,
      projectName: projectName.value || undefined,
      ratio: selectedRatio.value,
    }
    const res = await api.post('/api/cut-ecosystem/export/' + platform, body)
    if (res?.code === 200) {
      draftResult.value = res.data
      toast.success(`已生成${platform === 'jianying' ? '剪映' : 'CapCut'}项目文件`)
    } else {
      toast.error(res?.message || '导出失败')
    }
  } catch (e) {
    toast.error('导出请求失败')
  } finally {
    exporting.value = null
  }
}

function downloadDraft() {
  if (!draftResult.value) return
  const json = JSON.stringify(draftResult.value, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${draftResult.value.draft.draft_name || 'movio-draft'}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.cut-ecosystem-page {
  max-width: 960px; margin: 0 auto; padding: 24px;
}
.page-header { margin-bottom: 32px; }
.page-header h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
.page-header p { color: var(--text-muted); font-size: 14px; }

/* 平台选择 */
.platform-section { display: flex; gap: 16px; margin-bottom: 32px; }
.platform-card {
  flex: 1; padding: 24px; border: 2px solid var(--border-card);
  border-radius: 12px; cursor: pointer; text-align: center; transition: all .2s;
}
.platform-card:hover { border-color: var(--brand-light); }
.platform-card.active { border-color: var(--brand-color); background: var(--brand-light-alt); }
.platform-icon { font-size: 32px; margin-bottom: 8px; }
.platform-name { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
.platform-desc { font-size: 13px; color: var(--text-muted); }

/* 画幅 */
.ratio-section { margin-bottom: 32px; }
.ratio-section h3 { font-size: 16px; margin-bottom: 12px; }
.ratio-options { display: flex; gap: 10px; flex-wrap: wrap; }
.ratio-btn {
  padding: 8px 16px; border: 1px solid var(--border-card); border-radius: 8px;
  background: var(--bg-card); cursor: pointer; text-align: center; transition: all .2s;
  display: flex; flex-direction: column; gap: 2px;
}
.ratio-btn:hover { border-color: var(--brand-light); }
.ratio-btn.active { border-color: var(--brand-color); background: var(--brand-light-alt); }
.ratio-label { font-weight: 700; font-size: 15px; }
.ratio-desc { font-size: 11px; color: var(--text-muted); }

/* 作品网格 */
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.section-header h3 { font-size: 16px; }
.filter-row select {
  padding: 6px 12px; border: 1px solid var(--border-card); border-radius: 6px;
  background: var(--bg-card); font-size: 13px;
}
.works-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
.work-card {
  border: 2px solid var(--border-card); border-radius: 10px; overflow: hidden;
  cursor: pointer; transition: all .15s; position: relative;
}
.work-card:hover { border-color: var(--brand-light); transform: translateY(-2px); }
.work-card.selected { border-color: var(--brand-color); }
.work-check {
  position: absolute; top: 6px; right: 6px; z-index: 2;
  width: 22px; height: 22px; border-radius: 50%; border: 2px solid #ccc;
  background: var(--bg-card); display: flex; align-items: center; justify-content: center;
}
.work-card.selected .work-check { background: var(--brand-color); border-color: var(--brand-color); }
.check-mark { color: #fff; font-size: 13px; font-weight: 700; }
.work-thumb { width: 100%; height: 120px; overflow: hidden; }
.thumb-img { width: 100%; height: 100%; background-size: cover; background-position: center; }
.thumb-placeholder {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  font-size: 36px; background: var(--bg-hover);
}
.work-info { padding: 10px; }
.work-title { font-size: 13px; font-weight: 500; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.work-meta { display: flex; align-items: center; gap: 8px; }
.type-tag { font-size: 10px; padding: 1px 6px; border-radius: 4px; background: var(--bg-hover); }
.type-tag.video { background: #e8f4fd; color: #1a73e8; }
.type-tag.image { background: #fce8e6; color: #d93025; }
.work-date { font-size: 11px; color: var(--text-muted); }

.pagination { display: flex; justify-content: center; align-items: center; gap: 16px; margin-bottom: 32px; }
.pagination button {
  padding: 6px 16px; border: 1px solid var(--border-card); border-radius: 6px;
  background: var(--bg-card); cursor: pointer; font-size: 13px;
}
.pagination button:disabled { opacity: .4; cursor: not-allowed; }
.pagination span { font-size: 13px; color: var(--text-muted); }

/* 配置 */
.config-section { margin-bottom: 24px; }
.config-section label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px; }
.input { width: 100%; padding: 10px 14px; border: 1px solid var(--border-card); border-radius: 8px; font-size: 14px; }

/* 操作 */
.actions { display: flex; gap: 12px; margin-bottom: 32px; }
.btn-lg { padding: 12px 28px; font-size: 15px; }
.btn-primary {
  background: var(--brand-gradient); color: #fff; border: none; border-radius: 8px;
  cursor: pointer; font-weight: 600;
}
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-secondary {
  background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border-card);
  border-radius: 8px; cursor: pointer;
}
.btn-secondary:disabled { opacity: .5; cursor: not-allowed; }
.btn-text { background: none; border: none; color: var(--brand-color); cursor: pointer; font-size: 14px; }

/* 结果 */
.result-section { margin-bottom: 32px; }
.result-card {
  padding: 24px; border: 1px solid var(--brand-color); border-radius: 12px;
  background: var(--brand-light-alt);
}
.result-card h3 { font-size: 18px; margin-bottom: 16px; }
.result-info { margin-bottom: 16px; line-height: 1.8; }
.result-actions { display: flex; gap: 12px; margin-bottom: 16px; }
.draft-preview { margin-top: 12px; }
.draft-preview summary { cursor: pointer; font-size: 13px; color: var(--text-muted); }
.draft-preview pre { margin-top: 8px; background: var(--bg-card); padding: 16px; border-radius: 8px; font-size: 12px; overflow-x: auto; max-height: 400px; }

.loading-state, .empty-state { text-align: center; padding: 48px 0; color: var(--text-muted); }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-state p { margin-bottom: 16px; }
</style>
