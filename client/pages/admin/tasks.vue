<template>
  <AdminLayout>
    <div class="page-header">
      <h2>{{ $t('admin_tasks.page_title') }}</h2>
    </div>

    <div class="filters">
      <select v-model="status" @change="search">
        <option value="">{{ $t('admin_tasks.all_statuses') }}</option>
        <option value="0">{{ $t('admin_tasks.status_queued') }}</option>
        <option value="1">{{ $t('admin_tasks.status_processing') }}</option>
        <option value="2">{{ $t('admin_tasks.status_done') }}</option>
        <option value="3">{{ $t('admin_tasks.status_failed') }}</option>
      </select>
      <select v-model="typeGroup" @change="search">
        <option value="">{{ $t('admin_tasks.all_types') }}</option>
        <option value="image">{{ $t('admin_tasks.type_image') }}</option>
        <option value="video">{{ $t('admin_tasks.type_video') }}</option>
        <option value="batch">{{ $t('admin_tasks.type_batch') }}</option>
      </select>
      <input v-model="userId" type="text" :placeholder="$t('admin_tasks.user_id_placeholder')" @keyup.enter="search" />
      <button class="btn" @click="search">{{ $t('admin_tasks.search_btn') }}</button>
    </div>

    <LoadingSkeleton v-if="loading" type="table" :rows="8" :cols="7" />

    <div v-else-if="error" class="error-state">
      <span class="error-icon">⚠️</span>
      <p>{{ error }}</p>
      <button class="retry-btn" @click="fetchData">{{ $t('admin_tasks.retry') }}</button>
    </div>

    <template v-else-if="list.length">
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>{{ $t('admin_tasks.col_id') }}</th>
              <th>{{ $t('admin_tasks.col_user') }}</th>
              <th>{{ $t('admin_tasks.col_type') }}</th>
              <th>{{ $t('admin_tasks.col_status') }}</th>
              <th>{{ $t('admin_tasks.col_credits') }}</th>
              <th>{{ $t('admin_tasks.col_progress') }}</th>
              <th>{{ $t('admin_tasks.col_create_time') }}</th>
              <th>{{ $t('admin_tasks.col_action') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in list" :key="t.id" class="clickable" @click="openDetail(t)">
              <td class="mono">{{ t.id?.slice(0, 8) }}</td>
              <td>{{ t.nickname || t.username || '-' }}</td>
              <td>{{ typeLabel(t.type) }}</td>
              <td><span class="badge" :class="'s' + t.status">{{ statusLabel(t.status) }}</span></td>
              <td>{{ t.credits_consumed || 0 }}{{ $t('admin_tasks.points_unit') }}</td>
              <td><div class="progress-bar"><div class="fill" :style="{ width: progress(t) + '%' }"></div></div></td>
              <td class="time">{{ t.create_time }}</td>
              <td class="actions" @click.stop>
                <button v-if="t.status === 3" class="btn-sm" @click="retryTask(t)">{{ $t('admin_tasks.retry') }}</button>
                <button v-if="t.status === 0 || t.status === 1" class="btn-sm danger" @click="cancelTask(t)">{{ $t('admin_tasks.cancel') }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Pagination :page="page" :page-size="pageSize" :total="total" @change="onPageChange" />
    </template>
    <div v-else class="empty">{{ $t('admin_tasks.no_data') }}</div>

    <Teleport to="body">
      <div v-if="detailOpen" class="modal-overlay" @click.self="detailOpen = false" @keydown.escape="detailOpen = false">
        <div class="modal">
          <h3>{{ $t('admin_tasks.detail_title') }}</h3>
          <div class="detail-grid">
            <div class="detail-item"><span class="dl">{{ $t('admin_tasks.detail_id') }}</span><span class="dv mono">{{ detail.id }}</span></div>
            <div class="detail-item"><span class="dl">{{ $t('admin_tasks.detail_user') }}</span><span class="dv">{{ detail.nickname || detail.username || '-' }}</span></div>
            <div class="detail-item"><span class="dl">{{ $t('admin_tasks.detail_type') }}</span><span class="dv">{{ typeLabel(detail.type) }}</span></div>
            <div class="detail-item"><span class="dl">{{ $t('admin_tasks.detail_status') }}</span><span class="dv"><span class="badge" :class="'s' + detail.status">{{ statusLabel(detail.status) }}</span></span></div>
            <div class="detail-item"><span class="dl">{{ $t('admin_tasks.detail_credits') }}</span><span class="dv">{{ detail.credits_consumed || 0 }}{{ $t('admin_tasks.points_unit') }}</span></div>
            <div class="detail-item"><span class="dl">{{ $t('admin_tasks.detail_progress') }}</span><span class="dv">{{ progress(detail) }}%</span></div>
            <div class="detail-item"><span class="dl">{{ $t('admin_tasks.detail_create_time') }}</span><span class="dv">{{ detail.create_time }}</span></div>
            <div class="detail-item"><span class="dl">{{ $t('admin_tasks.detail_time') }}</span><span class="dv">{{ detail.update_time || '-' }}</span></div>
            <div class="detail-item full" v-if="detail.input_data"><span class="dl">{{ $t('admin_tasks.detail_params') }}</span><span class="dv"><pre>{{ JSON.stringify(detail.input_data, null, 2) }}</pre></span></div>
            <div class="detail-item full" v-if="detail.result_data"><span class="dl">{{ $t('admin_tasks.detail_result') }}</span><span class="dv"><pre>{{ JSON.stringify(detail.result_data, null, 2) }}</pre></span></div>
            <div class="detail-item full" v-if="detail.error_msg"><span class="dl">{{ $t('admin_tasks.detail_error') }}</span><span class="dv error-msg">{{ detail.error_msg }}</span></div>
          </div>
          <div class="modal-actions">
            <button v-if="detail.status === 3" class="btn-save" @click="retryTask(detail); detailOpen = false">{{ $t('admin_tasks.retry') }}</button>
            <button v-if="detail.status === 0 || detail.status === 1" class="btn-danger" @click="cancelTask(detail); detailOpen = false">{{ $t('admin_tasks.cancel') }}</button>
            <button class="btn-cancel" @click="detailOpen = false">{{ $t('admin_tasks.close_btn') }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </AdminLayout>
</template>

<script setup lang="ts">

const { t } = useI18n()
const { confirm } = useConfirm()

import AdminLayout from '~/components/AdminLayout.vue'

const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 30
const status = ref('')
const typeGroup = ref('')
const userId = ref('')
const loading = ref(true)
const error = ref('')
const detailOpen = ref(false)
const detail = ref<any>({})

const toast = useToast()

function statusLabel(s: number) {
  const m: Record<number, string> = {
    0: t('admin_tasks.status_queued'),
    1: t('admin_tasks.status_processing'),
    2: t('admin_tasks.status_done'),
    3: t('admin_tasks.status_failed')
  }
  return m[s] || t('admin_tasks.status_unknown')
}

function typeLabel(tp: string) {
  const m: Record<string, string> = {
    image: t('admin_tasks.type_image'),
    video: t('admin_tasks.type_video'),
    batch: t('admin_tasks.type_batch'),
    'main-image': t('admin_tasks.type_main_image'),
    scene: t('admin_tasks.type_scene'),
    'detail-h5': t('admin_tasks.type_detail_h5')
  }
  return m[tp] || tp || '-'
}

function progress(t: any) { if (t.status === 2) return 100; if (t.status === 3) return 100; if (t.status === 1) return 50; return 0 }

async function fetchData() {
  loading.value = true; error.value = ''
  try {
    const res: any = await $fetch('/api/admin/tasks', { params: { page: page.value, pageSize, status: status.value, typeGroup: typeGroup.value, userId: userId.value }, credentials: 'include' })
    if (res?.code === 200) { list.value = res.data?.list || []; total.value = res.data?.total || 0 }
    else { throw new Error(res?.msg || t('admin_tasks.fetch_failed')) }
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; error.value = err?.data?.msg || err.message || t('admin_tasks.load_failed'); toast.error(error.value) } finally { loading.value = false }
}

function search() { page.value = 1; fetchData() }
function onPageChange(p: number) { page.value = p; fetchData() }
function openDetail(t: any) { detail.value = t; detailOpen.value = true }

async function retryTask(t: any) {
  try {
    const res: any = await $fetch(`/api/admin/tasks/${t.id}/retry`, { method: 'POST', credentials: 'include' })
    if (res?.code === 200) { toast.success(t('admin_tasks.retry_success')); fetchData() }
    else { toast.error(res?.msg || t('admin_tasks.retry_failed')) }
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || err.message || t('admin_tasks.retry_failed')) }
}

async function cancelTask(t: any) {
  if (!await confirm({ message: t('admin_tasks.confirm_cancel') })) return
  try {
    const res: any = await $fetch(`/api/admin/tasks/${t.id}/cancel`, { method: 'POST', credentials: 'include' })
    if (res?.code === 200) { toast.success(t('admin_tasks.cancel_success')); fetchData() }
    else { toast.error(res?.msg || t('admin_tasks.cancel_failed')) }
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || err.message || t('admin_tasks.cancel_failed')) }
}

onMounted(fetchData)
definePageMeta({ layout: 'platform-admin', middleware: ['auth'] })
</script>

<style scoped>
.page-header { margin-bottom: 20px; }
h2 { font-size: 22px; font-weight: 700; color: var(--text-primary); }

.filters { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.filters select, .filters input { padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-md); font-size: 13px; outline: none; background: var(--bg-input); color: var(--text-primary); transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.filters select:focus, .filters input:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.btn { padding: 8px 16px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: 13px; transition: opacity var(--transition-fast); }
.btn:hover { opacity: 0.9; }

.table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.table { width: 100%; border-collapse: collapse; background: var(--bg-card); border-radius: var(--radius-lg); overflow: hidden; white-space: nowrap; }
.table th, .table td { padding: 10px 12px; font-size: 13px; text-align: left; border-bottom: 1px solid var(--table-border); }
.table th { background: var(--table-header-bg); font-weight: 600; color: var(--text-secondary); }
tr.clickable { cursor: pointer; transition: background var(--transition-fast); }
tr.clickable:hover { background: var(--table-row-hover); }
tr:hover td { background: var(--table-row-hover); }
.mono { font-family: monospace; font-size: 12px; }
.time { font-size: 11px; color: var(--text-muted); white-space: nowrap; }
.actions { display: flex; gap: 6px; }

.badge { padding: 2px 8px; border-radius: var(--badge-radius); font-size: var(--badge-font-size); }
.badge.s0 { background: var(--status-pending-bg); color: var(--status-pending-text); }
.badge.s1 { background: var(--status-processing-bg); color: var(--status-processing-text); }
.badge.s2 { background: var(--status-done-bg); color: var(--status-done-text); }
.badge.s3 { background: var(--status-fail-bg); color: var(--status-fail-text); }
.progress-bar { width: 60px; height: 4px; background: var(--border-light); border-radius: 2px; overflow: hidden; }
.progress-bar .fill { height: 100%; background: var(--brand); border-radius: 2px; transition: width var(--transition-slow); }

.error-state { text-align: center; padding: 60px 20px; }
.error-icon { font-size: 48px; }
.error-state p { color: var(--text-muted); margin: 12px 0 20px; font-size: 14px; }
.retry-btn { padding: 8px 24px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: 14px; transition: opacity var(--transition-fast); }
.retry-btn:hover { opacity: 0.9; }
.empty { text-align: center; padding: 40px; color: var(--text-muted); }

.btn-sm { padding: 4px 12px; border: 1px solid var(--border-light); border-radius: var(--radius-xs); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 12px; transition: border-color var(--transition-fast), color var(--transition-fast); }
.btn-sm:hover { border-color: var(--brand); color: var(--brand); }
.btn-sm.danger { color: var(--danger); border-color: var(--danger); }
.btn-sm.danger:hover { background: var(--danger); color: #fff; }

.modal-overlay { position: fixed; inset: 0; background: var(--modal-overlay); z-index: 5000; display: flex; align-items: center; justify-content: center; animation: overlay-fade-in var(--transition-base); }
.modal { background: var(--bg-card); border-radius: var(--modal-radius); padding: var(--modal-padding); width: 90%; max-width: 600px; max-height: 80vh; overflow-y: auto; box-shadow: var(--modal-shadow); animation: modal-enter var(--transition-slow); }
.modal h3 { font-size: 17px; font-weight: 600; margin-bottom: 20px; color: var(--text-primary); }
.detail-grid { display: flex; flex-direction: column; gap: 10px; }
.detail-item { display: flex; gap: 12px; align-items: flex-start; }
.detail-item.full { flex-direction: column; gap: 4px; }
.dl { font-size: 12px; color: var(--text-muted); min-width: 80px; flex-shrink: 0; }
.dv { font-size: 13px; color: var(--text-primary); word-break: break-all; }
.dv pre { background: var(--bg-hover); padding: 10px; border-radius: var(--radius-sm); font-size: 12px; overflow-x: auto; max-height: 200px; color: var(--text-primary); }
.error-msg { color: var(--danger); background: var(--status-fail-bg); padding: 8px 12px; border-radius: var(--radius-sm); }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
.btn-cancel { padding: 8px 20px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 13px; transition: border-color var(--transition-fast); }
.btn-cancel:hover { border-color: var(--text-muted); }
.btn-save { padding: 8px 20px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; transition: opacity var(--transition-fast); }
.btn-save:hover { opacity: 0.9; }
.btn-danger { padding: 8px 20px; background: var(--danger); color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; transition: opacity var(--transition-fast); }
.btn-danger:hover { opacity: 0.9; }

@media (max-width: 640px) {
  h2 { font-size: 18px; }
  .filters { flex-direction: column; }
  .filters select, .filters input { width: 100%; }
}
</style>
