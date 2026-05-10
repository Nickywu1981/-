<template>
  <div class="compare-tool">
    <header class="compare-header">
      <h1>图片对比 / AB测试</h1>
      <p>并排对比原图与生成图，挑选最佳效果</p>
    </header>

    <!-- 模式切换 -->
    <div class="mode-bar">
      <button v-for="m in modes" :key="m.key" class="mode-btn" :class="{ active: mode === m.key }" @click="mode = m.key">
        {{ m.icon }} {{ m.label }}
      </button>
    </div>

    <!-- 双图并排模式 -->
    <div v-if="mode === 'side'" class="side-panel">
      <div class="compare-row">
        <div class="compare-col">
          <div class="col-label">原图</div>
          <ImageSlot :src="original.src" :alt="original.alt" :title="original.title" empty-text="点击下方选择原图" @click="openPicker('original')" />
          <button class="pick-btn" @click="openPicker('original')">选择原图</button>
        </div>
        <div class="compare-col">
          <div class="col-label">生成图</div>
          <ImageSlot :src="variant.src" :alt="variant.alt" :title="variant.title" empty-text="点击下方选择生成图" @click="openPicker('variant')" />
          <button class="pick-btn" @click="openPicker('variant')">选择生成图</button>
        </div>
      </div>
      <div class="compare-actions">
        <button class="btn btn-ghost" @click="downloadBoth">下载两张图片</button>
        <span class="ratio-hint" v-if="original.src && variant.src">尺寸: {{ originalDims }} / {{ variantDims }}</span>
      </div>
    </div>

    <!-- 滑动覆盖对比模式 -->
    <div v-else-if="mode === 'slider'" class="slider-panel">
      <div class="slider-compare" ref="sliderRef" @mousemove="onSliderMove" @touchmove.prevent="onSliderTouch" @mouseleave="sliding = false" @mouseup="sliding = false">
        <img loading="lazy" v-if="variant.src" :src="variant.src" class="slider-bg" alt="生成图" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
        <img loading="lazy" v-if="original.src" :src="original.src" class="slider-fg" alt="原图" :style="{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
        <div v-if="original.src && variant.src" class="slider-line" :style="{ left: sliderPos + '%' }">
          <div class="slider-handle">⟷</div>
        </div>
        <div v-if="!original.src || !variant.src" class="slider-empty">请先选择原图和生成图</div>
      </div>
      <div class="slider-labels">
        <span>原图</span>
        <input type="range" min="0" max="100" v-model.number="sliderPos" class="slider-range" />
        <span>生成图</span>
      </div>
      <div class="compare-actions">
        <button class="pick-btn" @click="openPicker('original')">更换原图</button>
        <button class="pick-btn" @click="openPicker('variant')">更换生成图</button>
      </div>
    </div>

    <!-- 多图网格对比模式 -->
    <div v-else class="grid-panel">
      <div class="grid-header">
        <span>最多选择 6 张图片进行对比</span>
        <button class="btn btn-ghost btn-sm" @click="addGridSlot" :disabled="gridSlots.length >= 6">+ 添加图片</button>
      </div>
      <div class="grid-compare" :style="{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }">
        <div v-for="(slot, i) in gridSlots" :key="i" class="grid-col">
          <ImageSlot :src="slot.src" :alt="slot.alt" :title="slot.label" empty-text="点击选择" size="sm" @click="openGridPicker(i)" />
          <div class="grid-meta">
            <input v-model="slot.label" class="label-input" placeholder="标签" maxlength="50" />
            <button class="btn-remove" @click="removeGridSlot(i)" title="移除">✕</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 图片选择弹窗 -->
    <Teleport to="body">
      <div v-if="pickerOpen" class="picker-overlay" @click.self="pickerOpen = false">
        <div class="picker-modal">
          <div class="picker-header">
            <h3>{{ pickerTarget === 'original' ? '选择原图' : pickerTarget === 'variant' ? '选择生成图' : '选择图片' }}</h3>
            <button class="picker-close" @click="pickerOpen = false">✕</button>
          </div>
          <div class="picker-tabs">
            <button class="tab-btn" :class="{ active: pickerTab === 'works' }" @click="pickerTab = 'works'">我的作品</button>
            <button class="tab-btn" :class="{ active: pickerTab === 'upload' }" @click="pickerTab = 'upload'">上传新图</button>
          </div>
          <div v-if="pickerTab === 'works'" class="picker-body">
            <LoadingSkeleton v-if="worksLoading" type="card" :rows="4" />
            <div v-else-if="!works.length" class="empty">暂无作品</div>
            <div v-else class="works-grid">
              <div v-for="w in works" :key="w.id" class="work-card" :class="{ selected: pickerSelected === w.id }" @click="pickerSelected = w.id">
                <img loading="lazy" :src="w.result_url || w.output_result?.images?.[0]?.url" :alt="w.task_code || `#${w.id}`" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
                <span class="work-label">{{ w.task_code || `任务 #${w.id}` }}</span>
              </div>
            </div>
          </div>
          <div v-else class="picker-body upload-tab">
            <div class="dropzone" @dragover.prevent @drop.prevent="handleUploadDrop" @click="uploadInput?.click()">
              <p>拖拽图片或点击上传</p>
              <input ref="uploadInput" type="file" accept="image/*" hidden @change="handleUploadFile" />
            </div>
            <img loading="lazy" v-if="uploadPreview" :src="uploadPreview" class="upload-preview" alt="预览" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
            <p v-if="uploadingMsg" class="hint">{{ uploadingMsg }}</p>
          </div>
          <div class="picker-footer">
            <button class="btn btn-ghost" @click="pickerOpen = false">取消</button>
            <button class="btn btn-primary" :disabled="!pickerSelected && !uploadedUrl" @click="confirmPicker">确认选择</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 图片灯箱 -->
    <ImageLightbox ref="lightboxRef" />
  </div>
</template>

<script setup lang="ts">
const { createBlobUrl, revoke } = useBlobUrl()
import { useToast } from '#imports'
import ImageSlot from '~/components/ImageSlot.vue'
import { useBlobUrl } from '~/composables/useBlobUrl'

const toast = useToast()

const mode = ref<'side' | 'slider' | 'grid'>('side')
const modes = [
  { key: 'side' as const, label: '并排对比', icon: '⇆' },
  { key: 'slider' as const, label: '滑动覆盖', icon: '⟷' },
  { key: 'grid' as const, label: '多图网格', icon: '⊞' },
]

// --- Image slots ---
const original = reactive({ src: '', alt: '', title: '' })
const variant = reactive({ src: '', alt: '', title: '' })
const originalDims = computed(() => original.src ? '已有' : '-')
const variantDims = computed(() => variant.src ? '已有' : '-')

// --- Slider ---
const sliderPos = ref(50)
const sliding = ref(false)
const sliderRef = ref<HTMLElement | null>(null)
function onSliderMove(e: MouseEvent) {
  if (!sliderRef.value) return
  const rect = sliderRef.value.getBoundingClientRect()
  sliderPos.value = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
}
function onSliderTouch(e: TouchEvent) {
  if (!sliderRef.value) return
  const rect = sliderRef.value.getBoundingClientRect()
  sliderPos.value = Math.max(0, Math.min(100, ((e.touches[0].clientX - rect.left) / rect.width) * 100))
}

// --- Grid ---
const gridSlots = reactive<{ src: string; alt: string; label: string }[]>([])
const gridCols = computed(() => Math.min(gridSlots.length || 1, 3))
function addGridSlot() { if (gridSlots.length < 6) gridSlots.push({ src: '', alt: '', label: '' }) }
function removeGridSlot(i: number) { gridSlots.splice(i, 1) }

// --- Picker ---
const pickerOpen = ref(false)
const pickerTarget = ref<'original' | 'variant' | number>('original')
const pickerTab = ref<'works' | 'upload'>('works')
const pickerSelected = ref('')
const gridPickerIndex = ref(-1)
const { download } = useFileDownload()

const works = ref<any[]>([])
const worksLoading = ref(false)
const uploadPreview = ref('')
const uploadedUrl = ref('')
const uploadingMsg = ref('')
const uploadInput = ref<HTMLInputElement | null>(null)
const lightboxRef = ref<any>(null)

function openPicker(target: 'original' | 'variant') {
  pickerTarget.value = target
  pickerTab.value = 'works'
  pickerSelected.value = ''
  uploadedUrl.value = ''
  uploadPreview.value = ''
  uploadingMsg.value = ''
  pickerOpen.value = true
  fetchWorks()
}

function openGridPicker(i: number) {
  pickerTarget.value = i
  gridPickerIndex.value = i
  pickerTab.value = 'works'
  pickerSelected.value = ''
  uploadedUrl.value = ''
  uploadPreview.value = ''
  uploadingMsg.value = ''
  pickerOpen.value = true
  fetchWorks()
}

async function fetchWorks() {
  worksLoading.value = true
  try {
    const res: any = await $fetch('/api/tasks/my-works', { credentials: 'include', params: { pageSize: 50 } })
    works.value = res?.data?.list || []
  } catch { works.value = [] }
  worksLoading.value = false
}

function confirmPicker() {
  let url = ''
  if (pickerTab.value === 'upload' && uploadedUrl.value) {
    url = uploadedUrl.value
  } else if (pickerTab.value === 'works' && pickerSelected.value) {
    const w = works.value.find((x: any) => x.id === pickerSelected.value)
    url = w?.result_url || w?.output_result?.images?.[0]?.url || ''
  }
  if (!url) return

  if (pickerTarget.value === 'original') {
    original.src = url; original.alt = '原图'; original.title = '原图'
  } else if (pickerTarget.value === 'variant') {
    variant.src = url; variant.alt = '生成图'; variant.title = '生成图'
  } else if (typeof pickerTarget.value === 'number') {
    const i = pickerTarget.value as number
    if (gridSlots[i]) { gridSlots[i].src = url; gridSlots[i].alt = `图片 ${i + 1}` }
  }
  pickerOpen.value = false
}

async function handleUploadFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  uploadPreview.value = createBlobUrl(f)
  uploadingMsg.value = '上传中...'
  const fd = new FormData(); fd.append('file', f)
  try {
    const res: any = await $fetch('/api/upload/image', { method: 'POST', credentials: 'include', body: fd })
    uploadedUrl.value = res.data.url
    uploadingMsg.value = '上传完成 ✓'
    pickerSelected.value = ''
  } catch { uploadingMsg.value = '上传失败' }
}

function handleUploadDrop(e: DragEvent) {
  const f = e.dataTransfer?.files?.[0]
  if (!f) return
  uploadPreview.value = createBlobUrl(f)
  uploadingMsg.value = '上传中...'
  const fd = new FormData(); fd.append('file', f)
  $fetch('/api/upload/image', { method: 'POST', credentials: 'include', body: fd })
    .then((res: any) => { uploadedUrl.value = res.data.url; uploadingMsg.value = '上传完成 ✓'; pickerSelected.value = '' })
    .catch((e: any) => { uploadingMsg.value = '上传失败'; toast.error(e?.data?.msg || '上传失败') })
}

function downloadBoth() {
  [original, variant].forEach((img) => {
    if (!img.src) return
    download(img.src, img.alt || 'compare.png')
  })
}
</script>
<style scoped>
.compare-tool { max-width: 1200px; margin: 0 auto; padding: 24px; }
.compare-header { text-align: center; margin-bottom: 24px; }
.compare-header h1 { font-size: 24px; font-weight: 700; color: var(--text-primary); }
.compare-header p { font-size: 14px; color: var(--text-muted); margin-top: 4px; }

/* Mode bar */
.mode-bar { display: flex; justify-content: center; gap: 8px; margin-bottom: 24px; }
.mode-btn { padding: 8px 20px; border: 1px solid var(--border-light); border-radius: var(--radius-md); background: var(--bg-card); color: var(--text-secondary); cursor: pointer; font-size: 14px; transition: all 0.15s; }
.mode-btn:hover { border-color: var(--brand); color: var(--brand); }
.mode-btn.active { background: var(--brand); color: #fff; border-color: var(--brand); }

/* Side-by-side */
.compare-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
.compare-col { display: flex; flex-direction: column; gap: 8px; }
.col-label { font-size: 13px; font-weight: 600; color: var(--text-secondary); text-align: center; }
.pick-btn { padding: 6px 16px; border: 1px solid var(--brand); border-radius: var(--radius-sm); background: transparent; color: var(--brand); cursor: pointer; font-size: 12px; transition: all 0.15s; width: fit-content; margin: 0 auto; }
.pick-btn:hover { background: var(--brand); color: #fff; }
.compare-actions { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 12px; }
.ratio-hint { font-size: 12px; color: var(--text-muted); }

/* Slider */
.slider-panel { display: flex; flex-direction: column; align-items: center; }
.slider-compare { position: relative; width: 100%; max-width: 800px; aspect-ratio: 1; border-radius: var(--radius-lg); overflow: hidden; cursor: col-resize; background: var(--bg-hover); }
.slider-bg, .slider-fg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
.slider-fg { z-index: 2; }
.slider-line { position: absolute; top: 0; bottom: 0; width: 3px; background: var(--brand); z-index: 3; transform: translateX(-50%); pointer-events: none; }
.slider-handle { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 40px; height: 40px; background: var(--brand); border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
.slider-empty { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-size: 14px; }
.slider-labels { display: flex; align-items: center; gap: 12px; margin-top: 12px; font-size: 13px; color: var(--text-secondary); }
.slider-range { flex: 1; max-width: 300px; accent-color: var(--brand); }

/* Grid */
.grid-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; font-size: 14px; color: var(--text-secondary); }
.grid-compare { display: grid; gap: 16px; }
.grid-col { display: flex; flex-direction: column; gap: 6px; }
.grid-meta { display: flex; align-items: center; gap: 6px; }
.label-input { flex: 1; padding: 4px 8px; border: 1px solid var(--border-light); border-radius: var(--radius-sm); background: var(--bg-card); color: var(--text-primary); font-size: 12px; }
.btn-remove { padding: 2px 8px; border: none; background: transparent; color: var(--text-muted); cursor: pointer; font-size: 14px; }
.btn-remove:hover { color: #e53e3e; }

/* Picker modal */
.picker-overlay { position: fixed; inset: 0; z-index: 9000; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; }
.picker-modal { background: var(--bg-card); border-radius: var(--radius-xl); width: 90vw; max-width: 700px; max-height: 85vh; display: flex; flex-direction: column; overflow: hidden; }
.picker-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border-light); }
.picker-header h3 { font-size: 16px; font-weight: 600; color: var(--text-primary); }
.picker-close { background: none; border: none; font-size: 20px; color: var(--text-muted); cursor: pointer; }
.picker-tabs { display: flex; border-bottom: 1px solid var(--border-light); }
.picker-tabs .tab-btn { flex: 1; padding: 10px; border: none; background: transparent; color: var(--text-secondary); font-size: 13px; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.15s; }
.picker-tabs .tab-btn.active { color: var(--brand); border-bottom-color: var(--brand); }
.picker-body { flex: 1; overflow-y: auto; padding: 16px 20px; min-height: 200px; }
.picker-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px; border-top: 1px solid var(--border-light); }
.works-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.work-card { border: 2px solid var(--border-light); border-radius: var(--radius-md); overflow: hidden; cursor: pointer; transition: border-color 0.15s; }
.work-card:hover { border-color: var(--brand); }
.work-card.selected { border-color: var(--brand); box-shadow: 0 0 0 2px rgba(124,58,237,0.3); }
.work-card img { width: 100%; aspect-ratio: 1; object-fit: cover; display: block; }
.work-label { display: block; padding: 4px 8px; font-size: 11px; color: var(--text-secondary); text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.empty { text-align: center; color: var(--text-muted); padding: 40px 0; font-size: 14px; }
.upload-tab { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.dropzone { width: 100%; max-width: 400px; padding: 40px; border: 2px dashed var(--border-light); border-radius: var(--radius-lg); text-align: center; cursor: pointer; color: var(--text-muted); transition: border-color 0.15s; }
.dropzone:hover { border-color: var(--brand); }
.upload-preview { max-width: 300px; max-height: 300px; object-fit: contain; border-radius: var(--radius-md); }
.hint { font-size: 13px; color: var(--text-muted); }

/* Buttons */
.btn { padding: 8px 20px; border-radius: var(--radius-md); border: none; font-size: 14px; cursor: pointer; transition: all 0.15s; }
.btn-primary { background: var(--brand); color: #fff; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-ghost { background: transparent; color: var(--text-secondary); border: 1px solid var(--border-light); }
.btn-ghost:hover { border-color: var(--brand); color: var(--brand); }
.btn-sm { padding: 4px 12px; font-size: 12px; }

@media (max-width: 640px) {
  .compare-tool { padding: 16px; }
  .compare-row { grid-template-columns: 1fr; }
  .works-grid { grid-template-columns: repeat(3, 1fr); }
  .picker-modal { width: 95vw; max-height: 90vh; }
}
</style>
