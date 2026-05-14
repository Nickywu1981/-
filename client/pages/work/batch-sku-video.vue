<script setup lang="ts">
/** batch-sku-video — 多SKU批量视频生成 */
import { ref, computed, onUnmounted } from 'vue'

definePageMeta({ layout: 'workspace', middleware: ['auth'] })
const { t } = useI18n()

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
  { id: 'taobao', label: '淘宝' }, { id: 'douyin', label: '抖音' },
  { id: 'pinduoduo', label: '拼多多' }, { id: 'xiaohongshu', label: '小红书' },
  { id: 'tiktok', label: 'TikTok' }, { id: 'youtube', label: 'YouTube' },
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
  if (!productImages.value.length) return
  loading.value = true; taskId.value = ''; results.value = []

  try {
    const res = await fetch('/api/sku-batch/video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        productImages: productImages.value,
        skus: [{ color: '默认' }],
        platforms: selectedPlatforms.value,
        duration: duration.value,
        style: style.value,
      }),
    })
    const data = await res.json()
    taskId.value = data.data?.taskId
    totalCount.value = data.data?.estimatedCount || selectedPlatforms.value.length

    pollTimer.value = setInterval(async () => {
      const sr = await fetch(`/api/sku-batch/${taskId.value}`, { credentials: 'include' })
      const sd = await sr.json()
      results.value = sd.data?.results || []
      if (sd.data?.status === 'done' || sd.data?.status === 'failed') {
        clearInterval(pollTimer.value)
        loading.value = false
      }
    }, 2000)
  } catch {
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
  <WorkLayout :title="'多SKU批量视频'">
    <div class="bsv-root">
      <div class="bsv-field">
        <label class="bsv-label">商品图片 URL</label>
        <div class="bsv-add-row">
          <input v-model="imageInput" class="bsv-input" placeholder="输入图片URL..." @keydown.enter="addImage" />
          <button class="bsv-add-btn" @click="addImage">添加</button>
        </div>
        <div class="bsv-images">
          <div v-for="(img, i) in productImages" :key="i" class="bsv-img-tag">
            <img :src="img" class="bsv-thumb" />
            <button class="bsv-img-rm" @click="removeImage(i)">×</button>
          </div>
        </div>
      </div>

      <div class="bsv-row">
        <div class="bsv-field">
          <label class="bsv-label">时长 (秒)</label>
          <input v-model.number="duration" type="number" min="5" max="60" class="bsv-input" />
        </div>
        <div class="bsv-field">
          <label class="bsv-label">风格</label>
          <select v-model="style" class="bsv-input">
            <option value="showcase">产品展示</option>
            <option value="story">剧情带货</option>
            <option value="review">开箱测评</option>
          </select>
        </div>
      </div>

      <div class="bsv-field">
        <label class="bsv-label">目标平台</label>
        <div class="bsv-chips">
          <button v-for="p in allPlatforms" :key="p.id" class="bsv-chip" :class="{ sel: selectedPlatforms.includes(p.id) }" @click="togglePlatform(p.id)">{{ p.label }}</button>
        </div>
      </div>

      <button class="bsv-submit" :disabled="!productImages.length || loading" @click="submit">
        {{ loading ? `生成中 (${results.length}/${totalCount})...` : '开始批量生成视频' }}
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
.bsv-chip.sel { border-color: var(--brand); color: var(--brand); background: var(--brand-alpha, rgba(99,102,241,0.08)); }
.bsv-submit { width: 100%; padding: 12px; border: none; border-radius: var(--radius-md, 8px); background: var(--brand); color: #fff; font-size: 16px; font-weight: 600; cursor: pointer; }
.bsv-submit:disabled { opacity: 0.4; cursor: not-allowed; }
.bsv-results { margin-top: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.bsv-card { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border: 1px solid var(--border-light); border-radius: 6px; background: var(--bg-card); }
.bsv-plat { font-size: 13px; font-weight: 600; color: var(--text-primary); }
</style>
