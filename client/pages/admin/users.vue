<template>
  <AdminLayout>
    <div class="page-header">
      <h2>{{ $t('admin_users.page_title') }}</h2>
      <div class="header-actions">
        <button class="btn-outline" @click="exportCSV">{{ $t('admin_users.export') }}</button>
      </div>
    </div>

    <div class="toolbar">
      <input v-model="keyword" type="text" :placeholder="$t('admin_users.search_placeholder')" @keyup.enter="search" />
      <select v-model="filterStatus" class="sel" @change="search">
        <option value="">{{ $t('admin_users.all_statuses') }}</option>
        <option value="0">{{ $t('admin_users.status_normal') }}</option>
        <option value="1">{{ $t('admin_users.status_banned') }}</option>
      </select>
      <select v-model="filterPlan" class="sel" @change="search">
        <option value="">{{ $t('admin_users.all_plans') }}</option>
        <option value="0">{{ $t('admin_users.plan_free') }}</option><option value="1">{{ $t('admin_users.plan_monthly') }}</option><option value="2">{{ $t('admin_users.plan_quarterly') }}</option><option value="3">{{ $t('admin_users.plan_yearly') }}</option>
      </select>
      <button class="btn" @click="search">{{ $t('common.search') }}</button>
      <button v-if="selectedIds.size" class="btn-danger" @click="batchToggleStatus(1)">{{ $t('admin_users.batch_disable', { count: selectedIds.size }) }}</button>
      <button v-if="selectedIds.size" class="btn-outline" @click="batchToggleStatus(0)">{{ $t('admin_users.batch_enable', { count: selectedIds.size }) }}</button>
    </div>

    <LoadingSkeleton v-if="loading" type="table" :rows="8" :cols="9" />

    <div v-else-if="error" class="error-state">
      <span class="error-icon">⚠️</span>
      <p>{{ error }}</p>
      <button class="retry-btn" @click="fetchData">{{ $t('common.retry') }}</button>
    </div>

    <template v-else-if="list.length">
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th class="cb-col"><input type="checkbox" :checked="allSelected" @change="toggleAll" /></th>
              <th>{{ $t('common.id') }}</th><th>{{ $t('admin_users.col_username') }}</th><th>{{ $t('admin_users.col_nickname') }}</th><th>{{ $t('admin_users.col_phone') }}</th><th>{{ $t('admin_users.col_plan') }}</th><th>{{ $t('admin_users.col_balance') }}</th><th>{{ $t('admin_users.col_status') }}</th><th>{{ $t('admin_users.col_register_time') }}</th><th>{{ $t('common.action') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in list" :key="u.id" :class="{ selected: selectedIds.has(u.id) }">
              <td class="cb-col"><input type="checkbox" :checked="selectedIds.has(u.id)" @change="toggleOne(u.id)" /></td>
              <td>{{ u.id }}</td>
              <td>{{ u.username }}</td>
              <td>{{ u.nickname }}</td>
              <td>{{ u.phone || '-' }}</td>
              <td>{{ planLabel(u.plan_type) }}</td>
              <td>{{ u.credit_balance ?? 0 }}</td>
              <td><StatusBadge :variant="u.status === 0 ? 'success' : 'danger'" size="sm">{{ u.status === 0 ? $t('admin_users.status_normal') : $t('admin_users.status_banned') }}</StatusBadge></td>
              <td>{{ u.create_time?.slice(0, 10) }}</td>
              <td class="actions">
                <button class="btn-sm" @click="openEdit(u)">{{ $t('common.edit') }}</button>
                <button v-if="u.status === 0" class="btn-sm danger" @click="toggleStatus(u, 1)">{{ $t('common.disable') }}</button>
                <button v-else class="btn-sm" @click="toggleStatus(u, 0)">{{ $t('common.enable') }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Pagination :page="page" :page-size="pageSize" :total="total" @change="onPageChange" />
    </template>
    <div v-else class="empty">{{ $t('admin_users.no_data') }}</div>

    <Teleport to="body">
      <div v-if="editOpen" class="modal-overlay" @click.self="editOpen = false" @keydown.escape="editOpen = false">
        <div class="modal">
          <h3>{{ $t('admin_users.edit_user', { id: editForm.id }) }}</h3>
          <div class="form-grid">
            <label>{{ $t('admin_users.label_username') }} <input v-model="editForm.username" maxlength="100" /></label>
            <label>{{ $t('admin_users.label_nickname') }} <input v-model="editForm.nickname" maxlength="100" /></label>
            <label>{{ $t('admin_users.label_phone') }} <input v-model="editForm.phone" maxlength="20" /></label>
            <label>{{ $t('admin_users.label_plan_type') }}
              <select v-model="editForm.plan_type">
                <option :value="0">{{ $t('admin_users.plan_free') }}</option><option :value="1">{{ $t('admin_users.plan_monthly') }}</option><option :value="2">{{ $t('admin_users.plan_quarterly') }}</option><option :value="3">{{ $t('admin_users.plan_yearly') }}</option>
              </select>
            </label>
            <label>{{ $t('admin_users.label_balance') }} <input v-model.number="editForm.credit_balance" type="number" min="0" /></label>
            <label>{{ $t('admin_users.label_status') }}
              <select v-model="editForm.status"><option :value="0">{{ $t('admin_users.status_normal') }}</option><option :value="1">{{ $t('admin_users.status_banned') }}</option></select>
            </label>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" @click="editOpen = false">{{ $t('common.cancel') }}</button>
            <button class="btn-save" :disabled="saving" @click="saveEdit">{{ saving ? $t('common.saving') : $t('common.save') }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </AdminLayout>
</template>

<script setup lang="ts">
import StatusBadge from '~/components/shared/StatusBadge.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const { confirm } = useConfirm()
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const keyword = ref('')
const filterStatus = ref('')
const filterPlan = ref('')
const loading = ref(true)
const error = ref('')
const saving = ref(false)
const selectedIds = ref(new Set<number>())
const editOpen = ref(false)
const editForm = ref<any>({})
const { downloadBlob } = useFileDownload()

const toast = useToast()

const allSelected = computed(() => list.value.length > 0 && list.value.every(u => selectedIds.value.has(u.id)))

onMounted(fetchData)

async function fetchData() {
  loading.value = true; error.value = ''
  try {
    const params = new URLSearchParams({ page: String(page.value), pageSize: String(pageSize), keyword: keyword.value })
    if (filterStatus.value !== '') params.set('status', filterStatus.value)
    if (filterPlan.value !== '') params.set('planType', filterPlan.value)

    const data = await $fetch(`/api/admin/users?${params.toString()}`, { credentials: 'include' })
    const res = data as any
    if (res?.code === 200) { list.value = res.data.list || []; total.value = res.data.total || 0 }
    else { throw new Error(res?.msg || t('admin_users.list_failed')) }
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; error.value = err?.data?.msg || err.message || t('common.loadFail'); toast.error(error.value) } finally { loading.value = false }
}

function search() { page.value = 1; selectedIds.value = new Set(); fetchData() }
function onPageChange(p: number) { page.value = p; selectedIds.value = new Set(); fetchData() }

function toggleOne(id: number) {
  const s = new Set(selectedIds.value)
  s.has(id) ? s.delete(id) : s.add(id)
  selectedIds.value = s
}
function toggleAll() {
  if (allSelected.value) { selectedIds.value = new Set() }
  else { selectedIds.value = new Set(list.value.map(u => u.id)) }
}

const PLAN_LABELS: Record<number, string> = { 0: t('admin_users.plan_free'), 1: t('admin_users.plan_monthly'), 2: t('admin_users.plan_quarterly'), 3: t('admin_users.plan_yearly') }
function planLabel(pt: number) { return PLAN_LABELS[pt] || String(pt) }

async function toggleStatus(user: any, status: number) {
  if (!await confirm({ message: status === 1 ? t('admin_users.disable_confirm', { name: user.username }) : t('admin_users.enable_confirm', { name: user.username }) })) return
  try {
    const data = await $fetch(`/api/admin/users/${user.id}/status`, { method: 'PUT', credentials: 'include', body: { status } })
    const res = data as any
    if (res?.code === 200) { user.status = status; toast.success(status === 1 ? t('admin_users.disabled_msg', { name: user.username }) : t('admin_users.enabled_msg', { name: user.username })) }
    else { toast.error(res?.msg || t('common.fail')) }
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || err.message || t('common.fail')) }
}

async function batchToggleStatus(status: number) {
  const label = status === 1 ? t('admin_users.status_banned') : t('admin_users.status_normal')
  if (!await confirm({ message: status === 1 ? t('admin_users.batch_disable_confirm', { count: selectedIds.value.size }) : t('admin_users.batch_enable_confirm', { count: selectedIds.value.size }) })) return
  try {
    const ids = [...selectedIds.value]
    const data = await $fetch('/api/admin/users/batch-status', { method: 'PUT', credentials: 'include', body: { ids, status } })
    const res = data as any
    if (res?.code === 200) { toast.success(status === 1 ? t('admin_users.batch_disabled_msg', { count: ids.length }) : t('admin_users.batch_enabled_msg', { count: ids.length })); selectedIds.value = new Set(); fetchData() }
    else { toast.error(res?.msg || t('common.fail')) }
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || err.message || t('common.fail')) }
}

function openEdit(u: any) { editForm.value = { ...u }; editOpen.value = true }

async function saveEdit() {
  saving.value = true
  try {
    const data = await $fetch(`/api/admin/users/${editForm.value.id}`, { method: 'PUT', credentials: 'include', body: editForm.value })
    const res = data as any
    if (res?.code === 200) { toast.success(t('admin_users.user_updated')); editOpen.value = false; fetchData() }
    else { toast.error(res?.msg || t('common.save_failed')) }
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || err.message || t('common.save_failed')) } finally { saving.value = false }
}

function exportCSV() {
  const headers = [t('common.id'), t('admin_users.col_username'), t('admin_users.col_nickname'), t('admin_users.col_phone'), t('admin_users.col_plan'), t('admin_users.col_balance'), t('admin_users.col_status'), t('admin_users.col_register_time')]
  const planLabels: Record<number, string> = { 0: t('admin_users.plan_free'), 1: t('admin_users.plan_monthly'), 2: t('admin_users.plan_quarterly'), 3: t('admin_users.plan_yearly') }
  const statusLabels: Record<number, string> = { 0: t('admin_users.status_normal'), 1: t('admin_users.status_banned') }
  const rows = list.value.map(u => [
    u.id, u.username, u.nickname, u.phone || '',
    planLabels[u.plan_type] ?? '',
    u.credit_balance ?? 0, statusLabels[u.status] ?? '',
    u.create_time?.slice(0, 10) || '',
  ])
  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, `${t('admin_users.page_title')}_${new Date().toISOString().slice(0, 10)}.csv`)
  toast.success(t('admin_users.export_success'))
}
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
h2 { font-size: 22px; font-weight: 700; color: var(--text-primary); }
.header-actions { display: flex; gap: 8px; }

.toolbar { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
.toolbar input { flex: 1; min-width: 160px; max-width: 320px; padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--bg-input); color: var(--text-primary); transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.toolbar input:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.sel { padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--bg-card); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast); }
.sel:focus { border-color: var(--input-focus-border); }
.btn { padding: 8px 20px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; white-space: nowrap; transition: opacity var(--transition-fast); }
.btn:hover { opacity: 0.9; }
.btn-outline { padding: 8px 20px; background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--input-border); border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; white-space: nowrap; transition: border-color var(--transition-fast), color var(--transition-fast); }
.btn-outline:hover { border-color: var(--brand); color: var(--brand); }
.btn-danger { padding: 8px 20px; background: var(--danger); color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; white-space: nowrap; transition: opacity var(--transition-fast); }
.btn-danger:hover { opacity: 0.9; }

.table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; background: var(--bg-card); border-radius: var(--radius-lg); overflow: hidden; white-space: nowrap; }
.table th, .table td { text-align: left; padding: 10px; border-bottom: 1px solid var(--table-border); }
.table th { color: var(--text-secondary); font-weight: 500; font-size: 12px; background: var(--table-header-bg); }
tr:hover td { background: var(--table-row-hover); }
tr.selected { background: var(--brand-light); }
.cb-col { width: 40px; text-align: center; }
.actions { display: flex; gap: 6px; }

.error-state { text-align: center; padding: 60px 20px; }
.error-icon { font-size: 48px; }
.error-state p { color: var(--text-muted); margin: 12px 0 20px; font-size: 14px; }
.retry-btn { padding: 8px 24px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: 14px; transition: opacity var(--transition-fast); }
.retry-btn:hover { opacity: 0.9; }

.status { padding: 2px 8px; border-radius: var(--radius-xs); font-size: 12px; }
.status.active { background: var(--status-done-bg); color: var(--status-done-text); }
.status.banned { background: var(--status-fail-bg); color: var(--status-fail-text); }
.btn-sm { padding: 4px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-xs); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 12px; transition: border-color var(--transition-fast), color var(--transition-fast); }
.btn-sm:hover { border-color: var(--brand); color: var(--brand); }
.btn-sm.danger { color: var(--danger); border-color: var(--danger); }
.btn-sm.danger:hover { background: var(--danger); color: #fff; }
.empty { text-align: center; color: var(--text-muted); padding: 60px 0; }

.modal-overlay { position: fixed; inset: 0; background: var(--modal-overlay); z-index: 5000; display: flex; align-items: center; justify-content: center; animation: overlay-fade-in var(--transition-base); }
.modal { background: var(--bg-card); border-radius: var(--modal-radius); padding: var(--modal-padding); width: 90%; max-width: 520px; max-height: 80vh; overflow-y: auto; box-shadow: var(--modal-shadow); animation: modal-enter var(--transition-slow); }
.modal h3 { font-size: 17px; font-weight: 600; margin-bottom: 20px; color: var(--text-primary); }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-grid label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: var(--text-secondary); }
.form-grid input, .form-grid select { padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.form-grid input:focus, .form-grid select:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
.btn-cancel { padding: 8px 20px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 13px; transition: border-color var(--transition-fast); }
.btn-cancel:hover { border-color: var(--text-muted); }
.btn-save { padding: 8px 20px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; transition: opacity var(--transition-fast); }
.btn-save:hover { opacity: 0.9; }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

@media (max-width: 640px) {
  h2 { font-size: 18px; }
  .toolbar input { max-width: 100%; }
  .form-grid { grid-template-columns: 1fr; }
}
</style>
