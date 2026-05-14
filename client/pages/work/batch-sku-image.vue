<script setup lang="ts">
/** batch-sku-image — 多SKU批量生成独立页面 */
import { ref, computed, onUnmounted } from 'vue'
import SkuSelector from '~/components/work/batch-sku/SkuSelector.vue'
import BatchPreview from '~/components/work/batch-sku/BatchPreview.vue'

definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })

const { t } = useI18n()

interface SkuRow { id: string; color: string; colorHex: string; size: string; angle: string }

const step = ref<'config' | 'processing' | 'done'>('config')
const imageUrl = ref('')
const skus = ref<SkuRow[]>([])
const selectedPlatforms = ref<string[]>(['taobao', 'douyin'])
const selectedTypes = ref<string[]>(['main', 'white_bg'])
const quality = ref<'standard' | 'high'>('standard')

const results = ref<any[]>([])
const taskId = ref('')
const totalCount = computed(() => skus.value.length * selectedPlatforms.value.length * selectedTypes.value.length)

const allPlatforms = [
  { id: 'taobao', label: t('platforms.taobao') || '淘宝' },
  { id: 'pinduoduo', label: t('platforms.pinduoduo') || '拼多多' },
  { id: 'douyin', label: t('platforms.douyin') || '抖音' },
  { id: 'xiaohongshu', label: t('platforms.xiaohongshu') || '小红书' },
  { id: 'amazon', label: 'Amazon' },
  { id: 'shopee', label: 'Shopee' },
  { id: 'lazada', label: 'Lazada' },
  { id: 'temu', label: 'Temu' },
  { id: 'shein', label: 'Shein' },
  { id: 'tiktok_shop', label: 'TikTok Shop' },
]

const allTypes = [
  { id: 'main', label: t('batchPreview.types.main') },
  { id: 'white_bg', label: t('batchPreview.types.white_bg') },
  { id: 'scene', label: t('batchPreview.types.scene') },
  { id: 'render', label: t('batchPreview.types.render') },
]

const togglePlatform = (id: string) => {
  const idx = selectedPlatforms.value.indexOf(id)
  if (idx >= 0) selectedPlatforms.value.splice(idx, 1)
  else selectedPlatforms.value.push(id)
}

const toggleType = (id: string) => {
  const idx = selectedTypes.value.indexOf(id)
  if (idx >= 0) selectedTypes.value.splice(idx, 1)
  else selectedTypes.value.push(id)
}

const handleSkuUpdate = (s: SkuRow[]) => { skus.value = s }

const canSubmit = computed(() => imageUrl.value && skus.value.length > 0 && selectedPlatforms.value.length > 0 && selectedTypes.value.length > 0)

let pollTimer: ReturnType<typeof setInterval> | null = null

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})

const submit = async () => {
  if (!canSubmit.value) return
  step.value = 'processing'
  results.value = []

  try {
    const api = useApi()
    const data = await api.post('/sku-batch/image', {
      imageUrl: imageUrl.value,
      skus: skus.value.map(s => ({ color: s.color, colorHex: s.colorHex, size: s.size, angle: s.angle })),
      platforms: selectedPlatforms.value,
      types: selectedTypes.value,
      quality: quality.value,
    })
    taskId.value = data?.taskId

    pollTimer = setInterval(async () => {
      const task = await api.get(`/sku-batch/${taskId.value}`)
      results.value = task?.results || []
      if (task?.status === 'done' || task?.status === 'failed') {
        clearInterval(pollTimer!)
        pollTimer = null
        step.value = 'done'
      }
    }, 2000)
  } catch (err) {
    step.value = 'config'
    alert(t('work_pages.batch_sku_image.submit_failed'))
  }
}
</script>

<template>
  <WorkLayout :title="t('work_pages.batch_sku_image.name')">
    <!-- Step 1: Config -->
    <div v-if="step === 'config'" class="bsi-config">
      <div class="bsi-section">
        <label class="bsi-label">{{ t('work_pages.batch_sku_image.upload_image_label') }}</label>
        <input v-model="imageUrl" class="bsi-input" :placeholder="t('work_pages.batch_sku_image.image_url_placeholder')" />
        <span class="bsi-hint">{{ t('work_pages.batch_sku_image.image_hint') }}</span>
      </div>

      <SkuSelector @update="handleSkuUpdate" />

      <div class="bsi-section">
        <label class="bsi-label">{{ t('work_pages.batch_sku_image.select_platforms') }}</label>
        <div class="bsi-chips">
          <button v-for="p in allPlatforms" :key="p.id" class="bsi-chip" :class="{ sel: selectedPlatforms.includes(p.id) }" @click="togglePlatform(p.id)">{{ p.label }}</button>
        </div>
      </div>

      <div class="bsi-section">
        <label class="bsi-label">{{ t('work_pages.batch_sku_image.select_types') }}</label>
        <div class="bsi-chips">
          <button v-for="tp in allTypes" :key="tp.id" class="bsi-chip" :class="{ sel: selectedTypes.includes(tp.id) }" @click="toggleType(tp.id)">{{ tp.label }}</button>
        </div>
      </div>

      <div class="bsi-section">
        <label class="bsi-label">{{ t('work_pages.batch_sku_image.quality') }}</label>
        <select v-model="quality" class="bsi-select">
          <option value="standard">{{ t('work_pages.batch_sku_image.quality_standard') }}</option>
          <option value="high">{{ t('work_pages.batch_sku_image.quality_high') }}</option>
        </select>
      </div>

      <div class="bsi-summary">
        {{ t('work_pages.batch_sku_image.total_count', { count: totalCount, sku: skus.length, plat: selectedPlatforms.length, type: selectedTypes.length }) }}
      </div>

      <button class="bsi-submit" :disabled="!canSubmit" @click="submit">{{ t('work_pages.batch_sku_image.start_batch') }}</button>
    </div>

    <!-- Step 2: Processing / Done -->
    <div v-else>
      <BatchPreview :results="results" :total-count="totalCount" :completed-count="results.filter((r: any) => r.status === 'done').length" />
      <button v-if="step === 'done'" class="bsi-submit" @click="step = 'config'">{{ t('work_pages.batch_sku_image.regenerate') }}</button>
    </div>
  </WorkLayout>
</template>

<style scoped>
.bsi-config { max-width: 640px; margin: 0 auto; }
.bsi-section { margin-bottom: 16px; }
.bsi-label { display: block; font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; }
.bsi-input { width: 100%; padding: 10px 12px; border: 1px solid var(--border-light); border-radius: var(--radius-md, 8px); font-size: 14px; background: var(--bg-page); color: var(--text-primary); }
.bsi-input:focus { border-color: var(--brand); outline: none; }
.bsi-hint { display: block; font-size: 12px; color: var(--text-secondary); margin-top: 4px; }
.bsi-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.bsi-chip {
  padding: 5px 14px; border: 1px solid var(--border-light); border-radius: 6px;
  background: var(--bg-card); font-size: 13px; cursor: pointer; color: var(--text-secondary);
}
.bsi-chip.sel { border-color: var(--brand); color: var(--brand); background: var(--brand-alpha, rgba(99,102,241,0.08)); }
.bsi-select { padding: 8px 12px; border: 1px solid var(--border-light); border-radius: var(--radius-md, 8px); font-size: 14px; background: var(--bg-page); }
.bsi-summary { padding: 12px; border-radius: var(--radius-md, 8px); background: var(--brand-alpha, rgba(99,102,241,0.06)); font-size: 14px; color: var(--text-primary); margin: 16px 0; }
.bsi-submit {
  width: 100%; padding: 12px; border: none; border-radius: var(--radius-md, 8px);
  background: var(--brand); color: #fff; font-size: 16px; font-weight: 600; cursor: pointer;
}
.bsi-submit:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
