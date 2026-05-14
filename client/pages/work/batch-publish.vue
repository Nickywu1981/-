<script setup lang="ts">
/** batch-publish — 批量发布管理页面 */
import { ref } from 'vue'

definePageMeta({ layout: 'workspace', middleware: ['auth'] })
const { t } = useI18n()

const selectedPlatforms = ref<string[]>(['taobao', 'douyin'])
const workId = ref<number | null>(null)
const loading = ref(false)
const results = ref<Array<{ platform: string; status: string }>>([])

const allPlatforms = [
  { id: 'taobao', label: t('platforms.taobao') || '淘宝' },
  { id: 'douyin', label: t('platforms.douyin') || '抖音' },
  { id: 'pinduoduo', label: t('platforms.pinduoduo') || '拼多多' },
  { id: 'xiaohongshu', label: t('platforms.xiaohongshu') || '小红书' },
  { id: 'amazon', label: 'Amazon' },
  { id: 'shopee', label: 'Shopee' },
  { id: 'tiktok_shop', label: 'TikTok Shop' },
]

const togglePlatform = (id: string) => {
  const idx = selectedPlatforms.value.indexOf(id)
  if (idx >= 0) selectedPlatforms.value.splice(idx, 1)
  else selectedPlatforms.value.push(id)
}

const submit = async () => {
  if (!workId.value || !selectedPlatforms.value.length) return
  loading.value = true
  results.value = []
  try {
    const res = await fetch('/api/publish/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        workId: workId.value,
        platforms: selectedPlatforms.value,
      }),
    })
    const data = await res.json()
    if (data.code === 0) {
      results.value = selectedPlatforms.value.map(p => ({ platform: p, status: 'done' }))
    } else {
      results.value = selectedPlatforms.value.map(p => ({ platform: p, status: 'failed' }))
    }
  } catch {
    results.value = selectedPlatforms.value.map(p => ({ platform: p, status: 'failed' }))
  }
  loading.value = false
}
</script>

<template>
  <WorkLayout :title="t('work_pages.batch_publish.name')">
    <div class="bpn-root">
      <div class="bpn-field">
        <label class="bpn-label">{{ t('work_pages.batch_publish.target_platforms') }}</label>
        <div class="bpn-chips">
          <button v-for="p in allPlatforms" :key="p.id" class="bpn-chip" :class="{ sel: selectedPlatforms.includes(p.id) }" @click="togglePlatform(p.id)">{{ p.label }}</button>
        </div>
      </div>

      <div class="bpn-field">
        <label class="bpn-label">{{ t('work_pages.batch_publish.work_id') }}</label>
        <input v-model.number="workId" type="number" min="1" class="bpn-input" :placeholder="t('work_pages.batch_publish.work_id_placeholder')" />
      </div>

      <button class="bpn-submit" :disabled="!workId || !selectedPlatforms.length || loading" @click="submit">
        {{ loading ? t('work_pages.batch_publish.publishing') : t('work_pages.batch_publish.publish_to_n', { n: selectedPlatforms.length }) }}
      </button>

      <div v-if="results.length" class="bpn-results">
        <div v-for="r in results" :key="r.platform" class="bpn-card">
          <span>{{ r.platform }}</span>
          <span>{{ r.status === 'done' ? '✅' : '❌' }}</span>
        </div>
      </div>
    </div>
  </WorkLayout>
</template>

<style scoped>
.bpn-root { max-width: 520px; margin: 0 auto; }
.bpn-field { margin-bottom: 16px; }
.bpn-label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 6px; color: var(--text-primary); }
.bpn-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.bpn-chip { padding: 5px 14px; border: 1px solid var(--border-light); border-radius: 6px; background: var(--bg-card); font-size: 13px; cursor: pointer; color: var(--text-secondary); }
.bpn-chip.sel { border-color: var(--brand); color: var(--brand); background: var(--brand-alpha, rgba(99,102,241,0.08)); }
.bpn-input { flex: 1; padding: 10px 12px; border: 1px solid var(--border-light); border-radius: var(--radius-md, 8px); font-size: 14px; background: var(--bg-page); color: var(--text-primary); }
.bpn-input:focus { border-color: var(--brand); outline: none; }
.bpn-submit { width: 100%; padding: 12px; border: none; border-radius: var(--radius-md, 8px); background: var(--brand); color: #fff; font-size: 16px; font-weight: 600; cursor: pointer; }
.bpn-submit:disabled { opacity: 0.4; cursor: not-allowed; }
.bpn-results { margin-top: 16px; display: flex; flex-direction: column; gap: 6px; }
.bpn-card { display: flex; justify-content: space-between; padding: 8px 12px; border: 1px solid var(--border-light); border-radius: 6px; background: var(--bg-card); font-size: 14px; }
</style>
