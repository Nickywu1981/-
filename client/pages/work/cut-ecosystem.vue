<template>
  <div class="cut-ecosystem-page">
    <header class="page-header">
      <h1>{{ $t('work_pages.cut_ecosystem.title') }}</h1>
      <p>{{ $t('work_pages.cut_ecosystem.subtitle') }}</p>
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
      <h3>{{ $t('work_pages.cut_ecosystem.target_ratio') }}</h3>
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
        <h3>{{ $t('work_pages.cut_ecosystem.select_works') }}<h3>
        <div class="filter-row">
          <select v-model="filterType" @change="loadWorks">
            <option value="">{{ $t('work_pages.cut_ecosystem.all_types') }}<option>
            <option v-for="t in taskTypes" :key="t.value" :value="t.value">{{ $t(t.labelKey) }}</option>
          </select>
        </div>
      </div>

      <div v-if="loading" class="loading-state">{{ $t('work_pages.cut_ecosystem.loading') }}<div>

      <div v-else-if="works.length === 0" class="empty-state">
        <div class="empty-icon">📭</div>
        <p>{{ $t('work_pages.cut_ecosystem.no_works') }}<p>
        <router-link to="/workspace" class="btn-primary">{{ $t('work_pages.cut_ecosystem.go_create') }}<router-link>
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
            <div class="work-title">{{ w.title || $t('work_pages.cut_ecosystem.untitled') }}</div>
            <div class="work-meta">
              <span :class="['type-tag', w.type]">{{ w.type === 'video' ? $t('work_pages.cut_ecosystem.video_tag') : $t('work_pages.cut_ecosystem.image_tag') }}</span>
              <span class="work-date">{{ formatDate(w.create_time) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="works.length > 0" class="pagination">
        <button :disabled="page <= 1" @click="page--; loadWorks()">{{ $t('work_pages.cut_ecosystem.prev_page') }}<button>
        <span>{{ $t('work_pages.cut_ecosystem.page_of', { page, total: totalPages }) }}</span>
        <button :disabled="page >= totalPages" @click="page++; loadWorks()">{{ $t('work_pages.cut_ecosystem.next_page') }}<button>
      </div>
    </section>

    <!-- 项目名称 -->
    <section v-if="selectedIds.length > 0" class="config-section">
      <label>{{ $t('work_pages.cut_ecosystem.project_name') }}<label>
      <input v-model="projectName" class="input" :placeholder="$t('work_pages.cut_ecosystem.project_placeholder')" maxlength="100" />
    </section>

    <!-- 操作按钮 -->
    <section class="actions">
      <button
        :disabled="selectedIds.length === 0 || exporting"
        class="btn-primary btn-lg"
        @click="exportDraft('jianying')"
      >
        {{ exporting === 'jianying' ? $t('work_pages.cut_ecosystem.exporting') : $t('work_pages.cut_ecosystem.export_jy') }}
      </button>
      <button
        :disabled="selectedIds.length === 0 || exporting"
        class="btn-secondary btn-lg"
        @click="exportDraft('capcut')"
      >
        {{ exporting === 'capcut' ? $t('work_pages.cut_ecosystem.exporting') : $t('work_pages.cut_ecosystem.export_cc') }}
      </button>
    </section>

    <!-- 导出结果 -->
    <section v-if="draftResult" class="result-section">
      <div class="result-card">
        <h3>{{ $t('work_pages.cut_ecosystem.export_success') }}<h3>
        <div class="result-info">
          <div><strong>{{ $t('work_pages.cut_ecosystem.target_platform_label') }}</strong> {{ draftResult.platform === 'jianying' ? $t('work_pages.cut_ecosystem.platform_jy_name') : $t('work_pages.cut_ecosystem.platform_cc_name') }}</div>
          <div><strong>{{ $t('work_pages.cut_ecosystem.assets_count') }}</strong> {{ draftResult?.assets?.length ?? 0 }} {{ $t('work_pages.cut_ecosystem.items_unit') }}</div>
          <div><strong>{{ $t('work_pages.cut_ecosystem.project_name_label') }}</strong> {{ draftResult?.draft?.draft_name || '-' }}</div>
        </div>
        <div class="result-actions">
          <button class="btn-primary" @click="downloadDraft">{{ $t('work_pages.cut_ecosystem.download_project') }}<button>
          <button class="btn-text" @click="draftResult = null">{{ $t('work_pages.cut_ecosystem.close') }}<button>
        </div>
        <details class="draft-preview">
          <summary>{{ $t('work_pages.cut_ecosystem.preview_json') }}<summary>
          <pre>{{ JSON.stringify(draftResult.draft, null, 2) }}</pre>
        </details>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const { createBlobUrl, revoke } = useBlobUrl()
import { formatDate } from '@/utils/format';
const toast = useToast()
const { t } = useI18n()
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
const { downloadBlob } = useFileDownload()

const platforms = [
  { key: 'jianying', name: t('work_pages.cut_ecosystem.platform_jy_name'), icon: '✂️', desc: t('work_pages.cut_ecosystem.platform_jy_desc') },
  { key: 'capcut', name: t('work_pages.cut_ecosystem.platform_cc_name'), icon: '🌍', desc: t('work_pages.cut_ecosystem.platform_cc_desc') },
]

const taskTypes = [
  { value: 'video_gen', labelKey: 'work_pages.cut_ecosystem.type_video_gen' },
  { value: 'action_migrate', labelKey: 'work_pages.cut_ecosystem.type_action_migrate' },
  { value: 'digital_human', labelKey: 'work_pages.cut_ecosystem.type_digital_human' },
  { value: 'viral_replicate', labelKey: 'work_pages.cut_ecosystem.type_viral_replicate' },
  { value: 'live_clip', labelKey: 'work_pages.cut_ecosystem.type_live_clip' },
  { value: 'image_gen', labelKey: 'work_pages.cut_ecosystem.type_image_gen' },
  { value: 'detail_gen', labelKey: 'work_pages.cut_ecosystem.type_detail_gen' },
]

const ratios = ref([])

onMounted(async () => {
  await loadRatios()
  await loadWorks()
})

async function loadRatios() {
  try {
    const res = await api.get('/cut-ecosystem/ratios')
    ratios.value = res
  } catch { toast.warn(t('work_pages.cut_ecosystem.load_ratios_failed')) }
}

async function loadWorks() {
  loading.value = true
  try {
    const params: Record<string, string | number> = { page: page.value, pageSize }
    if (filterType.value) params.type = filterType.value
    const res = await api.get('/cut-ecosystem/works', { params })
    works.value = res.list || []
    totalPages.value = Math.max(1, Math.ceil((res.total || 0) / pageSize))
  } catch (e) {
    toast.error(t('work_pages.cut_ecosystem.load_works_failed'))
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
    toast.warn(t('work_pages.cut_ecosystem.max_select'))
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
    const res = await api.post('/cut-ecosystem/export/' + platform, body)
    if (res) {
      draftResult.value = res
      const platformName = platform === 'jianying' ? t('work_pages.cut_ecosystem.platform_jy_name') : t('work_pages.cut_ecosystem.platform_cc_name')
      toast.success(t('work_pages.cut_ecosystem.export_done', { name: platformName }))
    } else {
      toast.error(t('work_pages.cut_ecosystem.export_failed'))
    }
  } catch (e) {
    toast.error(t('work_pages.cut_ecosystem.export_request_failed'))
  } finally {
    exporting.value = null
  }
}

function downloadDraft() {
  if (!draftResult.value) return
  const json = JSON.stringify(draftResult.value, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  downloadBlob(blob, `${draftResult.value.draft.draft_name || 'movio-draft'}.json`)
}
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
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
  border-radius: 12px; cursor: pointer; text-align: center; transition: border-color .2s, background .2s;
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
  background: var(--bg-card); cursor: pointer; text-align: center; transition: border-color .2s, background .2s;
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
  cursor: pointer; transition: border-color .15s, transform .15s; position: relative;
}
.work-card:hover { border-color: var(--brand-light); transform: translateY(-2px); }
.work-card.selected { border-color: var(--brand-color); }
.work-check {
  position: absolute; top: 6px; right: 6px; z-index: 2;
  width: 22px; height: 22px; border-radius: 50%; border: 2px solid #767676;
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
.type-tag.video { background: #e8f4fd; color: var(--brand); }
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
