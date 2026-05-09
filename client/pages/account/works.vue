<template>
  <div class="account-page">
    <h2>我的作品</h2>
    <div class="tabs">
      <button v-for="t in tabs" :key="t.key" :class="{ active: activeTab === t.key }" @click="activeTab = t.key; fetchWorks()">{{ t.label }}</button>
    </div>
    <div v-if="loading" class="skeleton"><div v-for="i in 8" :key="i" class="skel-card" /></div>
    <div v-else-if="error" class="error-msg">{{ error }} <button @click="fetchWorks">重试</button></div>
    <div v-else-if="works.length" class="works-grid">
      <div v-for="w in works" :key="w.id" class="work-card" @click="previewWork(w)">
        <div class="work-thumb">
          <img v-if="w.output_url" :src="w.output_url" :alt="w.task_type" loading="lazy" />
          <div v-else class="thumb-placeholder">{{ w.task_type === 'video' ? '🎬' : '🖼' }}</div>
          <span class="type-badge">{{ typeLabel(w.task_type) }}</span>
        </div>
        <div class="work-info">
          <span class="work-type">{{ w.task_type_name || w.task_type }}</span>
          <span class="work-date">{{ formatDate(w.create_time || w.created_at) }}</span>
        </div>
      </div>
    </div>
    <div v-else class="empty">还没有作品，去工作台开始创作吧</div>
    <Pagination v-if="total > pageSize" :page="page" :total="total" :page-size="pageSize" @change="goPage" />

    <!-- Preview Modal -->
    <Teleport to="body">
      <div v-if="preview" class="preview-overlay" @click.self="preview = null">
        <div class="preview-modal">
          <button class="close-btn" @click="preview = null">✕</button>
          <img v-if="preview.output_url" :src="preview.output_url" :alt="preview.task_type" />
          <div class="preview-meta">
            <span>{{ typeLabel(preview.task_type) }}</span>
            <span>{{ formatDate(preview.create_time || preview.created_at) }}</span>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">

const works = ref<any[]>([])
const loading = ref(true)
const error = ref('')
const activeTab = ref('all')
const page = ref(1)
const total = ref(0)
const pageSize = 20
const preview = ref<any>(null)

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'image', label: '图片' },
  { key: 'video', label: '视频' },
]

const typeMap: Record<string,string> = {
  'remove-bg':'抠图','white-bg':'白底图','scene':'场景图','retouch':'精修','outpaint':'扩图',
  'virtual-tryon':'虚拟试穿','color-swap':'换色','style-transfer':'风格迁移','ghost-mannequin':'幽灵模特',
  'wrinkle-remove':'去褶皱','video':'视频','batch':'批量','voice-gen':'语音','voice-clone':'克隆',
  'video-edit':'视频编辑','script':'脚本','storyboard':'分镜','viral-clone':'爆款复刻',
  'image':'图片',
}

function typeLabel(t: string) { return typeMap[t] || t }
function formatDate(d: string) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('zh-CN', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' })
}

async function fetchWorks() {
  loading.value = true; error.value = ''
  try {
    const params = new URLSearchParams({ page: String(page.value), pageSize: String(pageSize) })
    if (activeTab.value !== 'all') params.set('type', activeTab.value)
    const res: any = await $fetch(`/api/tasks/my-works?${params.toString()}`, { credentials: 'include' })
    works.value = res.data?.list || res.data || []
    total.value = res.data?.total || 0
  } catch (e: any) {
    error.value = e.data?.message || '加载失败'
  } finally { loading.value = false }
}

function goPage(p: number) { page.value = p; fetchWorks() }
function previewWork(w: any) { preview.value = w }

onMounted(() => { fetchWorks() })
</script>

<style scoped>
.account-page { max-width: 960px; margin: 0 auto; padding: 24px; }
h2 { font-size: 22px; font-weight: 700; margin-bottom: 20px; }
.tabs { display: flex; gap: 8px; margin-bottom: 20px; }
.tabs button { padding: 7px 18px; border: 1px solid var(--border); border-radius: 20px; background: var(--bg-card); color: var(--text-secondary); font-size: 13px; cursor: pointer; transition: all .2s; }
.tabs button:hover { border-color: var(--brand); color: var(--brand); }
.tabs button.active { background: var(--brand); color: #fff; border-color: var(--brand); }

.works-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
.work-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; cursor: pointer; transition: all .25s; }
.work-card:hover { transform: translateY(-3px); box-shadow: 0 8px 28px var(--shadow); border-color: var(--brand-light); }
.work-thumb { aspect-ratio: 1; overflow: hidden; position: relative; background: var(--bg-elevated); display: flex; align-items: center; justify-content: center; }
.work-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform .3s; }
.work-card:hover .work-thumb img { transform: scale(1.05); }
.thumb-placeholder { font-size: 40px; }
.type-badge { position: absolute; top: 8px; right: 8px; padding: 3px 8px; border-radius: 6px; background: rgba(0,0,0,.55); color: #fff; font-size: 11px; backdrop-filter: blur(4px); }
.work-info { padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
.work-type { color: var(--text-primary); font-weight: 500; }
.work-date { color: var(--text-tertiary); font-size: 12px; }

.empty, .error-msg { text-align: center; padding: 60px 20px; color: var(--text-tertiary); }
.error-msg { color: var(--danger); }
.error-msg button { margin-left: 8px; color: var(--brand); cursor: pointer; background: none; border: none; text-decoration: underline; }
.skeleton { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
.skel-card { height: 240px; background: var(--bg-elevated); border-radius: 12px; animation: pulse 1.5s infinite; }
@keyframes pulse { 0%,100% { opacity: .5 } 50% { opacity: 1 } }

.preview-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.75); z-index: 9999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
.preview-modal { background: var(--bg-card); border-radius: 16px; max-width: 90vw; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; }
.preview-modal img { max-width: 80vw; max-height: 75vh; object-fit: contain; }
.preview-meta { padding: 16px; display: flex; justify-content: space-between; color: var(--text-secondary); font-size: 14px; }
.close-btn { position: absolute; top: 20px; right: 20px; width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,.2); border: none; color: #fff; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .2s; }
.close-btn:hover { background: rgba(255,255,255,.35); }

@media (max-width: 640px) {
  .account-page { padding: 16px; }
  .works-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
}
</style>
