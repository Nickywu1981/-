<script setup lang="ts">
/** batch-publish — 批量发布管理页面 */
import { ref } from 'vue'

definePageMeta({ layout: 'workspace', middleware: ['auth'] })
const { t } = useI18n()

const selectedPlatforms = ref<string[]>(['taobao', 'douyin'])
const contentUrls = ref<string[]>([])
const urlInput = ref('')
const loading = ref(false)
const results = ref<Array<{ platform: string; status: string }>>([])

const allPlatforms = [
  { id: 'taobao', label: '淘宝' }, { id: 'douyin', label: '抖音' },
  { id: 'pinduoduo', label: '拼多多' }, { id: 'xiaohongshu', label: '小红书' },
  { id: 'amazon', label: 'Amazon' }, { id: 'shopee', label: 'Shopee' },
  { id: 'tiktok_shop', label: 'TikTok Shop' },
]

const togglePlatform = (id: string) => {
  const idx = selectedPlatforms.value.indexOf(id)
  if (idx >= 0) selectedPlatforms.value.splice(idx, 1)
  else selectedPlatforms.value.push(id)
}

const addUrl = () => {
  const url = urlInput.value.trim()
  if (url) { contentUrls.value.push(url); urlInput.value = '' }
}
const removeUrl = (i: number) => contentUrls.value.splice(i, 1)

const submit = async () => {
  loading.value = true
  results.value = []
  for (const plat of selectedPlatforms.value) {
    try {
      await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ platform: plat, contentUrls: contentUrls.value }),
      })
      results.value.push({ platform: plat, status: 'done' })
    } catch {
      results.value.push({ platform: plat, status: 'failed' })
    }
  }
  loading.value = false
}
</script>

<template>
  <WorkLayout :title="'批量发布管理'">
    <div class="bpn-root">
      <div class="bpn-field">
        <label class="bpn-label">目标平台</label>
        <div class="bpn-chips">
          <button v-for="p in allPlatforms" :key="p.id" class="bpn-chip" :class="{ sel: selectedPlatforms.includes(p.id) }" @click="togglePlatform(p.id)">{{ p.label }}</button>
        </div>
      </div>

      <div class="bpn-field">
        <label class="bpn-label">内容 / 商品链接</label>
        <div class="bpn-add-row">
          <input v-model="urlInput" class="bpn-input" placeholder="输入内容或商品URL..." @keydown.enter="addUrl" />
          <button class="bpn-add-btn" @click="addUrl">添加</button>
        </div>
        <div class="bpn-list">
          <div v-for="(url, i) in contentUrls" :key="i" class="bpn-item">
            <span class="bpn-url">{{ url.slice(0, 60) }}</span>
            <button class="bpn-rm" @click="removeUrl(i)">×</button>
          </div>
        </div>
      </div>

      <button class="bpn-submit" :disabled="!selectedPlatforms.length || !contentUrls.length || loading" @click="submit">
        {{ loading ? '发布中...' : `一键发布到 ${selectedPlatforms.length} 个平台` }}
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
.bpn-add-row { display: flex; gap: 8px; }
.bpn-input { flex: 1; padding: 10px 12px; border: 1px solid var(--border-light); border-radius: var(--radius-md, 8px); font-size: 14px; background: var(--bg-page); color: var(--text-primary); }
.bpn-input:focus { border-color: var(--brand); outline: none; }
.bpn-add-btn { padding: 10px 16px; border: none; border-radius: var(--radius-md, 8px); background: var(--brand); color: #fff; font-size: 14px; cursor: pointer; }
.bpn-list { margin-top: 8px; }
.bpn-item { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; border: 1px solid var(--border-light); border-radius: 4px; font-size: 13px; margin-bottom: 4px; }
.bpn-url { color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bpn-rm { border: none; background: none; color: var(--text-secondary); cursor: pointer; font-size: 16px; }
.bpn-submit { width: 100%; padding: 12px; border: none; border-radius: var(--radius-md, 8px); background: var(--brand); color: #fff; font-size: 16px; font-weight: 600; cursor: pointer; }
.bpn-submit:disabled { opacity: 0.4; cursor: not-allowed; }
.bpn-results { margin-top: 16px; display: flex; flex-direction: column; gap: 6px; }
.bpn-card { display: flex; justify-content: space-between; padding: 8px 12px; border: 1px solid var(--border-light); border-radius: 6px; background: var(--bg-card); font-size: 14px; }
</style>
