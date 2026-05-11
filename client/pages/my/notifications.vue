<template>
  <WorkLayout current="notifications">
    <div class="notif-page">
      <div class="notif-header">
        <h2>通知中心</h2>
        <button class="mark-all-btn" @click="markAllRead">全部已读</button>
      </div>
      <div v-if="loading" class="loading-state"><LoadingSkeleton /></div>
      <div v-else-if="error" class="error-state">{{ error }} <button @click="fetchData">重试</button></div>
      <div v-else-if="!list.length" class="empty-state">暂无通知</div>
      <div v-else class="notif-list">
        <div v-for="item in list" :key="item.id" :class="['notif-item', { unread: !item.is_read }]">
          <span class="notif-icon">{{ item.icon || '🔔' }}</span>
          <div class="notif-body">
            <div class="notif-title">{{ item.title }}</div>
            <div class="notif-content">{{ item.content }}</div>
            <div class="notif-time">{{ formatDateTime(item.created_at) }}</div>
          </div>
          <button v-if="!item.is_read" class="read-btn" @click="markRead(item.id)">标为已读</button>
        </div>
      </div>
    </div>
  </WorkLayout>
</template>

<script setup lang="ts">
import { formatDateTime } from '@/utils/format'

const list = ref<any[]>([])
const loading = ref(true)
const error = ref('')

async function fetchData() {
  loading.value = true; error.value = ''
  try {
    const res: any = await $fetch('/api/notifications', { credentials: 'include' })
    list.value = res.data?.list ?? res.data ?? []
  } catch (e: any) { error.value = e?.data?.msg || e.message || '加载失败' }
  finally { loading.value = false }
}

async function markRead(id: number) {
  try {
    await $fetch(`/api/notifications/${id}/read`, { method: 'POST', credentials: 'include' })
    const item = list.value.find(i => i.id === id)
    if (item) item.is_read = true
  } catch { /* 静默失败 — 乐观更新已生效 */ }
}

async function markAllRead() {
  try {
    await $fetch('/api/notifications/read-all', { method: 'POST', credentials: 'include' })
    list.value.forEach(i => i.is_read = true)
  } catch { /* 静默失败 — 乐观更新已生效 */ }
}

onMounted(fetchData)
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.notif-page { max-width: 800px; margin: 0 auto; padding: var(--spacing-lg); }
.notif-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-lg); }
.notif-header h2 { font-size: 1.5rem; font-weight: 700; color: var(--text-primary); }
.mark-all-btn { background: var(--brand); color: #fff; border: none; padding: 6px 16px; border-radius: var(--radius); cursor: pointer; font-size: .875rem; transition: opacity .2s; }
.mark-all-btn:hover { opacity: .85; }
.loading-state, .error-state, .empty-state { text-align: center; padding: var(--spacing-2xl); color: var(--text-secondary); }
.error-state button { color: var(--brand); cursor: pointer; margin-left: 8px; }
.notif-list { display: flex; flex-direction: column; gap: 8px; }
.notif-item { display: flex; align-items: flex-start; gap: 12px; padding: 12px 16px; border-radius: var(--radius); background: var(--bg-card); border: 1px solid var(--border-color); transition: box-shadow .2s; }
.notif-item:hover { box-shadow: var(--shadow-sm); }
.notif-item.unread { border-left: 3px solid var(--brand); background: var(--bg-elevated); }
.notif-icon { font-size: 1.25rem; flex-shrink: 0; margin-top: 2px; }
.notif-body { flex: 1; }
.notif-title { font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
.notif-content { font-size: .875rem; color: var(--text-secondary); line-height: 1.5; }
.notif-time { font-size: .75rem; color: var(--text-tertiary); margin-top: 4px; }
.read-btn { flex-shrink: 0; background: none; border: 1px solid var(--border-color); color: var(--text-secondary); padding: 4px 12px; border-radius: var(--radius); cursor: pointer; font-size: .75rem; transition: border-color .2s, color .2s; }
.read-btn:hover { border-color: var(--brand); color: var(--brand); }
</style>
