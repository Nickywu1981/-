<template>
  <div class="distribution-page">
    <div class="page-header">
      <div>
        <h1>多平台一键分发</h1>
        <p class="subtitle">13 个主流平台，内容一键推送，批量追踪</p>
      </div>
    </div>

    <!-- 平台选择 -->
    <div class="section">
      <h2>选择目标平台</h2>
      <div class="platform-grid">
        <label v-for="p in platforms" :key="p.id" class="platform-card" :class="{ selected: selected.includes(p.id) }">
          <input type="checkbox" :value="p.id" v-model="selected" class="platform-check" />
          <span class="platform-icon">{{ p.icon }}</span>
          <span class="platform-name">{{ p.name }}</span>
          <span class="platform-status" :class="{ connected: p.connected }">{{ p.connected ? '已授权' : '待授权' }}</span>
        </label>
      </div>
    </div>

    <!-- 内容配置 -->
    <div class="section" v-if="selected.length > 0">
      <h2>内容配置</h2>
      <div class="form-group">
        <label>标题</label>
        <input v-model="form.title" class="input" placeholder="输入发布标题" />
      </div>
      <div class="form-group">
        <label>描述</label>
        <textarea v-model="form.description" class="input" rows="3" placeholder="输入描述文案（支持 #话题标签）" />
      </div>
      <div class="form-group">
        <label>图片素材</label>
        <input type="file" accept="image/*" multiple @change="onFiles" class="input" />
        <span class="hint">支持多图，自动适配各平台尺寸</span>
      </div>
      <div class="form-group">
        <label>定时发布</label>
        <input v-model="form.scheduledAt" type="datetime-local" class="input" />
        <span class="hint">留空则立即发布</span>
      </div>
    </div>

    <!-- 发布操作 -->
    <div class="section" v-if="selected.length > 0">
      <div class="action-bar">
        <button class="btn-primary" :disabled="submitting" @click="publish">
          {{ submitting ? '发布中...' : `一键发布到 ${selected.length} 个平台` }}
        </button>
        <button class="btn-outline" @click="saveDraft">保存草稿</button>
      </div>
    </div>

    <!-- 发布历史 -->
    <div class="section">
      <h2>发布记录</h2>
      <LoadingSkeleton v-if="loading" type="list" :rows="3" />
      <div v-else-if="history.length === 0" class="empty-hint">暂无发布记录</div>
      <table v-else class="history-table">
        <thead>
          <tr><th>内容</th><th>平台</th><th>状态</th><th>时间</th><th>操作</th></tr>
        </thead>
        <tbody>
          <tr v-for="h in history" :key="h.id">
            <td>{{ h.title }}</td>
            <td>{{ h.platforms?.join(', ') || '-' }}</td>
            <td><span class="status-tag" :class="h.status">{{ statusLabel(h.status) }}</span></td>
            <td>{{ formatDateTime(h.createdAt) }}</td>
            <td><button v-if="h.status === 'failed'" class="btn-sm" @click="retry(h.id)">重试</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatDateTime } from '@/utils/format'

const platforms = [
  { id: 'taobao', name: '淘宝', icon: '🛒', connected: true },
  { id: 'jd', name: '京东', icon: '🐶', connected: true },
  { id: 'pdd', name: '拼多多', icon: '🔻', connected: true },
  { id: 'douyin', name: '抖音', icon: '🎵', connected: false },
  { id: 'kuaishou', name: '快手', icon: '▶️', connected: false },
  { id: 'xiaohongshu', name: '小红书', icon: '📕', connected: false },
  { id: 'wechat', name: '视频号', icon: '💬', connected: false },
  { id: 'bilibili', name: 'B站', icon: '📺', connected: false },
  { id: 'amazon', name: 'Amazon', icon: '📦', connected: false },
  { id: 'shopee', name: 'Shopee', icon: '🦐', connected: false },
  { id: 'lazada', name: 'Lazada', icon: '🛍️', connected: false },
  { id: 'ebay', name: 'eBay', icon: '🛒', connected: false },
  { id: 'shopify', name: 'Shopify', icon: '🏪', connected: false },
]

const selected = ref<string[]>([])
const submitting = ref(false)
const loading = ref(true)
const history = ref<any[]>([])
const form = reactive({ title: '', description: '', scheduledAt: '', files: [] as File[] })

const statusLabel = (s: string) =>
  ({ pending: '等待中', processing: '发布中', success: '已发布', failed: '失败' }[s] || s)

const onFiles = (e: Event) => {
  const files = (e.target as HTMLInputElement).files
  if (files) form.files = Array.from(files)
}

const toast = useToast()

const publish = async () => {
  if (!form.title) return toast.warn('请输入标题')
  submitting.value = true
  try {
    const fd = new FormData()
    fd.append('title', form.title)
    fd.append('description', form.description)
    fd.append('platforms', JSON.stringify(selected.value))
    if (form.scheduledAt) fd.append('scheduledAt', form.scheduledAt)
    form.files.forEach(f => fd.append('files', f))
    await $fetch('/api/publish/submit', { method: 'POST', body: fd })
    toast.success('发布成功！')
    fetchHistory()
  } catch (e: any) {
    toast.error(e.message || '发布失败')
  } finally {
    submitting.value = false
  }
}

const saveDraft = async () => {
  try {
    await $fetch('/api/publish/drafts', {
      method: 'POST',
      body: { title: form.title, description: form.description, platforms: selected.value },
    })
    toast.success('草稿已保存')
  } catch { /* silent */ }
}

const retry = async (id: number) => {
  try { await $fetch(`/api/publish/retry/${id}`, { method: 'POST' }); fetchHistory() } catch { /* */ }
}

const fetchHistory = async () => {
  loading.value = true
  try {
    const { data } = await useFetch('/api/distribution/history')
    history.value = (data.value as any)?.list || (data.value as any)?.data || []
  } finally {
    loading.value = false
  }
}

onMounted(fetchHistory)
</script>
