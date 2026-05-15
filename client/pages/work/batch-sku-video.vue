<script setup lang="ts">
/** batch-sku-video — 多SKU批量视频生成 */
import { ref, onUnmounted } from 'vue'

definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
const { t } = useI18n()
const toast = useToast()

const productImages = ref<string[]>([])
const imageInput = ref('')
const loading = ref(false)
const taskId = ref('')
const results = ref<any[]>([])
const pollTimer = ref<ReturnType<typeof setInterval>>()
const totalCount = ref(0)

const selectedPlatforms = ref(['douyin'])
const duration = ref(15)
const style = ref<'showcase' | 'story' | 'review'>('showcase')

const allPlatforms = [
  { id: 'taobao', label: t('platforms.taobao') || '淘宝' },
  { id: 'douyin', label: t('platforms.douyin') || '抖音' },
  { id: 'pinduoduo', label: t('platforms.pinduoduo') || '拼多多' },
  { id: 'xiaohongshu', label: t('platforms.xiaohongshu') || '小红书' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
]

const togglePlatform = (id: string) => {
  const idx = selectedPlatforms.value.indexOf(id)
  if (idx >= 0) selectedPlatforms.value.splice(idx, 1)
  else selectedPlatforms.value.push(id)
}

const addImage = () => {
  const url = imageInput.value.trim()
  if (url && !productImages.value.includes(url)) {
    productImages.value.push(url)
    imageInput.value = ''
  }
}
const removeImage = (i: number) => productImages.value.splice(i, 1)

const submit = async () => {
  if (!productImages.value.length || loading.value) return
  loading.value = true; taskId.value = ''; results.value = []

  try {
    const api = useApi()
    const data = await api.post('/sku-batch/video', {
      productImages: productImages.value,
      skus: [{ color: '默认' }],
      platforms: selectedPlatforms.value,
      duration: duration.value,
      style: style.value,
    })
    taskId.value = data?.taskId
    totalCount.value = data?.estimatedCount || selectedPlatforms.value.length

    pollTimer.value = setInterval(async () => {
      try {
        const task = await api.get(`/sku-batch/${taskId.value}`)
        results.value = task?.results || []
        if (task?.status === 'done' || task?.status === 'failed') {
          clearInterval(pollTimer.value)
          loading.value = false
        }
      } catch {
        // keep polling
      }
    }, 2000)
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string };
    toast.error(err?.data?.msg || t('work_pages.batch_sku_video.submit_failed'))
    loading.value = false
  }
}

onUnmounted(() => {
  if (pollTimer.value) {
    clearInterval(pollTimer.value)
    pollTimer.value = undefined
  }
})
</script>

<template>
  <WorkLayout :title="t('work_pages.batch_sku_video.name')">
    <div class="bsv-root">
      <div class="bsv-field">
        <label class="bsv-label">{{ t('work_pages.batch_sku_video.product_image_url') }}</label>
        <div class="bsv-add-row">
          <input v-model="imageInput" class="bsv-input" :placeholder="t('work_pages.batch_sku_video.image_url_placeholder')" @keydown.enter="addImage" />
          <button class="bsv-add-btn" @click="addImage">{{ t('work_pages.batch_sku_video.add') }}</button>
        </div>
        <div class="bsv-images">
          <div v-for="(img, i) in productImages" :key="i" class="bsv-img-tag">
            <img :src="img" alt="SKU image thumbnail" class="bsv-thumb" />
            <button class="bsv-img-rm" :aria-label="$t('common.remove')" @click="removeImage(i)">×</button>
          </div>
        </div>
      </div>

      <div class="bsv-row">
        <div class="bsv-field">
          <label class="bsv-label">{{ t('work_pages.batch_sku_video.duration_seconds') }}</label>
          <input v-model.number="duration" type="number" min="5" max="60" class="bsv-input" />
        </div>
        <div class="bsv-field">
          <label class="bsv-label">{{ t('work_pages.batch_sku_video.style') }}</label>
          <select v-model="style" class="bsv-input">
            <option value="showcase">{{ t('work_pages.batch_sku_video.style_showcase') }}</option>
            <option value="story">{{ t('work_pages.batch_sku_video.style_story') }}</option>
            <option value="review">{{ t('work_pages.batch_sku_video.style_review') }}</option>
          </select>
        </div>
      </div>

      <div class="bsv-field">
        <label class="bsv-label">{{ t('work_pages.batch_sku_video.target_platforms') }}</label>
        <div class="bsv-chips">
          <button v-for="p in allPlatforms" :key="p.id" class="bsv-chip" :class="{ sel: selectedPlatforms.includes(p.id) }" @click="togglePlatform(p.id)">{{ p.label }}</button>
        </div>
      </div>

      <button class="bsv-submit" :disabled="!productImages.length || loading" @click="submit">
        {{ loading ? t('work_pages.batch_sku_video.generating_progress', { n: results.length, total: totalCount }) : t('work_pages.batch_sku_video.start_batch') }}
      </button>

      <div v-if="results.length" class="bsv-results">
        <div v-for="(r, i) in results" :key="i" class="bsv-card">
          <span class="bsv-plat">{{ r.platform }}</span>
          <span v-if="r.url" class="bsv-status-ok">✅</span>
          <span v-else class="bsv-status-fail">❌</span>
        </div>
      </div>
    </div>
  </WorkLayout>
</template>

<style scoped>
.bsv-root { max-width: 640px; margin: 0 auto; }
.bsv-field { margin-bottom: 16px; }
.bsv-label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 6px; color: var(--text-primary); }
.bsv-add-row { display: flex; gap: 8px; }
.bsv-input { flex: 1; padding: 10px 12px; border: 1px solid var(--border-light); border-radius: var(--radius-md, 8px); font-size: 14px; background: var(--bg-page); color: var(--text-primary); }
.bsv-input:focus { border-color: var(--brand); outline: none; }
.bsv-add-btn { padding: 10px 16px; border: none; border-radius: var(--radius-md, 8px); background: var(--brand); color: #fff; font-size: 14px; cursor: pointer; }
.bsv-images { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
.bsv-img-tag { position: relative; width: 64px; height: 64px; border: 1px solid var(--border-light); border-radius: 6px; overflow: hidden; }
.bsv-thumb { width: 100%; height: 100%; object-fit: cover; }
.bsv-img-rm { position: absolute; top: 0; right: 0; border: none; background: rgba(0,0,0,0.5); color: #fff; font-size: 14px; cursor: pointer; width: 20px; height: 20px; }
.bsv-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.bsv-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.bsv-chip { padding: 5px 14px; border: 1px solid var(--border-light); border-radius: 6px; background: var(--bg-card); font-size: 13px; cursor: pointer; color: var(--text-secondary); }
.bsv-chip.sel { border-color: var(--brand); color: var(--brand); background: var(--brand-alpha, rgba(var(--brand-rgb, 91,95,227), 0.08)); }
.bsv-submit { width: 100%; padding: 12px; border: none; border-radius: var(--radius-md, 8px); background: var(--brand); color: #fff; font-size: 16px; font-weight: 600; cursor: pointer; }
.bsv-submit:disabled { opacity: 0.4; cursor: not-allowed; }
.bsv-results { margin-top: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.bsv-card { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border: 1px solid var(--border-light); border-radius: 6px; background: var(--bg-card); }
.bsv-plat { font-size: 13px; font-weight: 600; color: var(--text-primary); }
</style>
