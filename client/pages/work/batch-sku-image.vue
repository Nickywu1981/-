<script setup lang="ts">
/** batch-sku-image — 多SKU批量生成独立页面 */
import { ref, computed, onUnmounted } from 'vue'
import SkuSelector from '~/components/work/batch-sku/SkuSelector.vue'
import BatchPreview from '~/components/work/batch-sku/BatchPreview.vue'

definePageMeta({ layout: 'workspace', middleware: ['auth'] })

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
  { id: 'taobao', label: '淘宝' }, { id: 'pinduoduo', label: '拼多多' },
  { id: 'douyin', label: '抖音' }, { id: 'xiaohongshu', label: '小红书' },
  { id: 'amazon', label: 'Amazon' }, { id: 'shopee', label: 'Shopee' },
  { id: 'lazada', label: 'Lazada' }, { id: 'temu', label: 'Temu' },
  { id: 'shein', label: 'Shein' }, { id: 'tiktok_shop', label: 'TikTok Shop' },
]

const allTypes = [
  { id: 'main', label: '主图' }, { id: 'white_bg', label: '白底图' },
  { id: 'scene', label: '场景图' }, { id: 'render', label: '渲染图' },
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
    const res = await fetch('/api/sku-batch/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        imageUrl: imageUrl.value,
        skus: skus.value.map(s => ({ color: s.color, colorHex: s.colorHex, size: s.size, angle: s.angle })),
        platforms: selectedPlatforms.value,
        types: selectedTypes.value,
        quality: quality.value,
      }),
    })
    const data = await res.json()
    taskId.value = data.data?.taskId

    pollTimer = setInterval(async () => {
      const statusRes = await fetch(`/api/sku-batch/${taskId.value}`, { credentials: 'include' })
      const statusData = await statusRes.json()
      const task = statusData.data
      results.value = task.results || []
      if (task.status === 'done' || task.status === 'failed') {
        clearInterval(pollTimer!)
        pollTimer = null
        step.value = 'done'
      }
    }, 2000)
  } catch (err) {
    step.value = 'config'
    alert('提交失败，请重试')
  }
}
</script>

<template>
  <WorkLayout :title="t('work_pages.batch_sku_image_name') || '多SKU批量生成'">
    <!-- Step 1: Config -->
    <div v-if="step === 'config'" class="bsi-config">
      <div class="bsi-section">
        <label class="bsi-label">上传商品原图 URL</label>
        <input v-model="imageUrl" class="bsi-input" placeholder="输入商品图片URL..." />
        <span class="bsi-hint">支持 jpg/png/webp，建议 2000×2000 以上</span>
      </div>

      <SkuSelector @update="handleSkuUpdate" />

      <div class="bsi-section">
        <label class="bsi-label">选择目标平台</label>
        <div class="bsi-chips">
          <button v-for="p in allPlatforms" :key="p.id" class="bsi-chip" :class="{ sel: selectedPlatforms.includes(p.id) }" @click="togglePlatform(p.id)">{{ p.label }}</button>
        </div>
      </div>

      <div class="bsi-section">
        <label class="bsi-label">选择生成类型</label>
        <div class="bsi-chips">
          <button v-for="tp in allTypes" :key="tp.id" class="bsi-chip" :class="{ sel: selectedTypes.includes(tp.id) }" @click="toggleType(tp.id)">{{ tp.label }}</button>
        </div>
      </div>

      <div class="bsi-section">
        <label class="bsi-label">质量</label>
        <select v-model="quality" class="bsi-select">
          <option value="standard">标准（快速）</option>
          <option value="high">高清（较慢）</option>
        </select>
      </div>

      <div class="bsi-summary">
        总计: <strong>{{ totalCount }}</strong> 张图
        ({{ skus.length }} SKU × {{ selectedPlatforms.length }} 平台 × {{ selectedTypes.length }} 类型)
      </div>

      <button class="bsi-submit" :disabled="!canSubmit" @click="submit">开始批量生成</button>
    </div>

    <!-- Step 2: Processing / Done -->
    <div v-else>
      <BatchPreview :results="results" :total-count="totalCount" :completed-count="results.filter((r: any) => r.status === 'done').length" />
      <button v-if="step === 'done'" class="bsi-submit" @click="step = 'config'">重新生成</button>
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
