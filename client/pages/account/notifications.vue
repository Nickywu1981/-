<template>
  <ClientOnly>
    <div class="notif-page">
      <div class="notif-header">
        <h2>{{ $t('account.notifications.title') }}</h2>
        <button v-if="notifications.length" class="btn-mark-all" @click="markAll">{{ $t('account.notifications.mark_all_read') }}</button>
      </div>

      <div v-if="loading" class="notif-loading">
        <div class="skeleton-row" v-for="n in 4" :key="n" />
      </div>

      <div v-else-if="error" class="notif-error">
        <p>{{ error }}</p>
        <button class="btn-retry" @click="fetchList">{{ $t('account.notifications.retry') }}</button>
      </div>

      <div v-else-if="!notifications.length" class="notif-empty">
        <span class="notif-empty-icon">🔔</span>
        <p>{{ $t('account.notifications.empty') }}</p>
      </div>

      <div v-else class="notif-list">
        <div
          v-for="item in notifications"
          :key="item.id"
          class="notif-item"
          :class="{ unread: !item.is_read }"
          @click="readOne(item)"
        >
          <div class="notif-icon">{{ item.type === 'system' ? '📢' : item.type === 'task' ? '📋' : '💰' }}</div>
          <div class="notif-body">
            <p class="notif-title">{{ item.title }}</p>
            <p class="notif-content">{{ item.content }}</p>
            <span class="notif-time">{{ formatDateTime(item.created_at) }}</span>
          </div>
          <div v-if="!item.is_read" class="notif-dot" />
        </div>
      </div>

      <Pagination v-if="total > pageSize" :page="page" :total="total" :page-size="pageSize" @change="onPageChange" />
    </div>
  </ClientOnly>
</template>

<script lang="ts" setup>
import { formatDateTime } from '@/utils/format'
const { t } = useI18n()

const notifications = ref<any[]>([])
const loading = ref(true)
const error = ref('')
const toast = useToast()
const page = ref(1)
const pageSize = 20
const total = ref(0)

function onPageChange(p: number) { page.value = p; fetchList(); }

async function fetchList() {
  loading.value = true
  error.value = ''
  try {
    const res: any = await $fetch(`/api/notifications?page=${page.value}&pageSize=${pageSize}`, { credentials: 'include' })
    notifications.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch (e: unknown) {
    const err = e as { data?: { msg?: string }; message?: string };
    error.value = err?.data?.msg || err.message || t('account.notifications.load_failed')
  } finally {
    loading.value = false
  }
}

async function readOne(item: any) {
  if (item.is_read) return
  try {
    await $fetch(`/api/notifications/${item.id}/read`, { method: 'PUT' })
    item.is_read = 1
  } catch { toast.error(t('common.failed_mark_read')) }
}

async function markAll() {
  try {
    await $fetch('/api/notifications/read-all', { method: 'PUT' })
    notifications.value.forEach((n: any) => n.is_read = 1)
  } catch { toast.error(t('common.failed_mark_all_read')) }
}

onMounted(fetchList)
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.notif-page { max-width: 720px; margin: 0 auto; padding: 24px; }
.notif-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.notif-header h2 { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 0; }
.btn-mark-all { font-size: 0.875rem; color: var(--brand); background: none; border: none; cursor: pointer; transition: opacity 0.2s; }
.btn-mark-all:hover { opacity: 0.75; }
.notif-loading { display: flex; flex-direction: column; gap: 12px; }
.skeleton-row { height: 72px; background: var(--bg-secondary); border-radius: 10px; animation: pulse 1.5s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
.notif-error { text-align: center; padding: 40px 0; color: var(--danger); }
.btn-retry { margin-top: 12px; padding: 8px 20px; background: var(--brand); color: #fff; border: none; border-radius: 8px; cursor: pointer; }
.notif-empty { text-align: center; padding: 60px 0; color: var(--text-tertiary); }
.notif-empty-icon { font-size: 2.5rem; display: block; margin-bottom: 12px; }
.notif-list { display: flex; flex-direction: column; gap: 6px; }
.notif-item { display: flex; align-items: flex-start; gap: 14px; padding: 16px; background: var(--bg-primary); border-radius: 10px; cursor: pointer; transition: background 0.2s, transform 0.15s; position: relative; }
.notif-item:hover { background: var(--bg-secondary); transform: translateX(2px); }
.notif-item.unread { background: var(--brand-bg); }
.notif-icon { font-size: 1.25rem; flex-shrink: 0; margin-top: 2px; }
.notif-body { flex: 1; min-width: 0; }
.notif-title { font-size: 0.9rem; font-weight: 600; color: var(--text-primary); margin: 0 0 4px; }
.notif-content { font-size: 0.825rem; color: var(--text-secondary); margin: 0 0 6px; line-height: 1.45; }
.notif-time { font-size: 0.75rem; color: var(--text-tertiary); }
.notif-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--brand); flex-shrink: 0; margin-top: 8px; }
</style>
