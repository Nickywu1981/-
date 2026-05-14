<template>
  <AdminLayout>
    <div class="page-header">
      <h1>{{ $t('common.proxy_manage') }}</h1>
      <button class="btn-primary" @click="openCreate">+ {{ $t('common.proxy_new') }}</button>
    </div>

    <div class="toolbar">
      <input v-model="keyword" type="text" :placeholder="$t('common.proxy_search_placeholder')" @keyup.enter="search" />
      <select v-model="filterStatus" class="sel" @change="search">
        <option value="">{{ $t('common.all') }}{{ $t('common.status') }}</option>
        <option value="1">{{ $t('common.statusEnabled') }}</option>
        <option value="0">{{ $t('common.banned') }}</option>
      </select>
      <button class="btn" @click="search">{{ $t('common.search') }}</button>
    </div>

    <LoadingSkeleton v-if="loading" type="table" :rows="5" :cols="9" />

    <div v-else-if="error" class="error-state">
      <span class="error-icon">⚠️</span>
      <p>{{ error }}</p>
      <button class="retry-btn" @click="fetchData">{{ $t('common.retry') }}</button>
    </div>

    <template v-else-if="list.length">
      <div class="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>{{ $t('common.name') }}</th><th>{{ $t('common.code') }}</th><th>{{ $t('common.upstream_url_label') }}</th><th>{{ $t('common.method_label') }}</th><th>{{ $t('common.auth_method_label') }}</th><th>{{ $t('common.timeout_label') }}</th><th>{{ $t('common.status') }}</th><th>{{ $t('common.actions') }}</th></tr></thead>
          <tbody>
            <tr v-for="p in list" :key="p.id">
              <td>{{ p.id }}</td><td>{{ p.name }}</td><td>{{ p.proxy_code }}</td>
              <td class="url-cell">{{ p.upstream_url }}</td>
              <td>{{ p.method }}</td><td>{{ p.auth_type }}</td>
              <td>{{ p.timeout_ms }}ms</td>
              <td><span :class="p.status===1?'badge-ok':'badge-off'">{{ p.status===1 ? $t('common.enable') : $t('common.banned') }}</span></td>
              <td class="actions">
                <button class="btn-sm" @click="openEdit(p)">{{ $t('common.edit') }}</button>
                <button class="btn-sm" @click="toggleStatus(p)">{{ p.status===1 ? $t('common.banned') : $t('common.enable') }}</button>
                <button class="btn-sm danger" @click="delProxy(p.id)">{{ $t('common.delete') }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Pagination :page="page" :page-size="pageSize" :total="total" @change="onPageChange" />
    </template>
    <div v-else class="empty">{{ $t('common.proxy_empty') }}</div>

    <Teleport to="body">
      <div v-if="modalOpen" class="modal-overlay" @click.self="modalOpen = false" @keydown.escape="modalOpen = false">
        <div class="modal">
          <h3>{{ isEdit ? $t('common.proxy_edit') : $t('common.proxy_new') }}</h3>
          <div class="form-grid">
            <label>{{ $t('common.name') }} <input v-model="form.name" maxlength="100" :placeholder="$t('common.proxy_name_placeholder')" /></label>
            <label>{{ $t('common.code') }} <input v-model="form.proxy_code" maxlength="50" :placeholder="$t('common.proxy_code_placeholder')" /></label>
            <label class="full">{{ $t('common.upstream_url_label') }} <input v-model="form.upstream_url" maxlength="500" placeholder="https://api.example.com/v1" /></label>
            <label>{{ $t('common.request_method_label') }}
              <select v-model="form.method">
                <option value="GET">GET</option><option value="POST">POST</option><option value="PUT">PUT</option><option value="DELETE">DELETE</option><option value="PATCH">PATCH</option>
              </select>
            </label>
            <label>{{ $t('common.auth_method_label') }}
              <select v-model="form.auth_type">
                <option value="none">{{ $t('common.none') }}</option><option value="api_key">API Key</option><option value="bearer">Bearer Token</option><option value="basic">Basic Auth</option>
              </select>
            </label>
            <label>{{ $t('common.timeout_label') }} <input v-model.number="form.timeout_ms" type="number" min="1" /></label>
            <label>{{ $t('common.status') }}
              <select v-model="form.status"><option :value="1">{{ $t('common.statusEnabled') }}</option><option :value="0">{{ $t('common.banned') }}</option></select>
            </label>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" @click="modalOpen = false">{{ $t('common.cancel') }}</button>
            <button class="btn-save" :disabled="saving" @click="save">{{ saving ? $t('common.saving') : $t('common.save') }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </AdminLayout>
</template>

<script setup lang="ts">const { t } = useI18n()


const { confirm } = useConfirm()

const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 15
const keyword = ref('')
const filterStatus = ref('')
const loading = ref(true)
const error = ref('')
const saving = ref(false)
const modalOpen = ref(false)
const isEdit = ref(false)
const form = ref<any>({})

const toast = useToast()
onMounted(fetchData)

async function fetchData() {
  loading.value = true; error.value = ''
  try {
    const params = new URLSearchParams({ page: String(page.value), pageSize: String(pageSize), keyword: keyword.value })
    if (filterStatus.value) params.set('status', filterStatus.value)
    const res: any = await $fetch(`/api/proxy?${params.toString()}`)
    if (res?.code === 200) { list.value = res.data?.list || []; total.value = res.data?.total || 0 }
    else { list.value = res.data || []; total.value = list.value.length }
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; error.value = err?.data?.msg || err.message || t('common.loadFail'); toast.error(error.value) } finally { loading.value = false }
}

function search() { page.value = 1; fetchData() }
function onPageChange(p: number) { page.value = p; fetchData() }
function openCreate() { isEdit.value = false; form.value = { name: '', proxy_code: '', upstream_url: '', method: 'POST', auth_type: 'api_key', timeout_ms: 10000, status: 1 }; modalOpen.value = true }
function openEdit(p: any) { isEdit.value = true; form.value = { ...p }; modalOpen.value = true }

async function save() {
  saving.value = true
  try {
    const url = isEdit.value ? `/api/proxy/${form.value.id}` : '/api/proxy'
    const method = isEdit.value ? 'PUT' : 'POST'
    const res: any = await $fetch(url, { method, body: form.value })
    if (res?.code === 200 || res?.code === 0) { toast.success(isEdit.value ? t('common.success_update') : t('common.success_create')); modalOpen.value = false; fetchData() }
    else { toast.error(res?.msg || t('common.failed_save')) }
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || err.message || t('common.failed_save')) } finally { saving.value = false }
}

async function toggleStatus(p: any) {
  const newStatus = p.status === 1 ? 0 : 1
  try {
    const res: any = await $fetch(`/api/proxy/${p.id}`, { method: 'PUT', body: { status: newStatus } })
    if (res?.code === 200 || res?.code === 0) { p.status = newStatus; toast.success(newStatus === 1 ? t('common.success_enable') : t('common.success_disable')) }
    else { toast.error(res?.msg || t('common.failed')) }
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || err.message || t('common.failed')) }
}

async function delProxy(id: number) {
  if (!await confirm({ message: t('common.confirm_delete')} )) return
  try {
    const res: any = await $fetch(`/api/proxy/${id}`, { method: 'DELETE' })
    if (res?.code === 200 || res?.code === 0) { toast.success(t('common.delete_success')); fetchData() }
    else { toast.error(res?.msg || t('common.failed_delete')) }
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || err.message || t('common.failed_delete')) }
}
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
h1 { font-size: 20px; font-weight: 700; color: var(--text-primary); }
.btn-primary { padding: 8px 20px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: 13px; transition: opacity var(--transition-fast); }
.btn-primary:hover { opacity: 0.9; }

.toolbar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.toolbar input { flex: 1; min-width: 160px; max-width: 280px; padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--bg-input); color: var(--text-primary); transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.toolbar input:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.sel { padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--bg-card); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast); }
.sel:focus { border-color: var(--input-focus-border); }
.btn { padding: 8px 16px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; transition: opacity var(--transition-fast); }
.btn:hover { opacity: 0.9; }

.table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
table { width: 100%; border-collapse: collapse; background: var(--bg-card); border-radius: var(--radius-lg); overflow: hidden; white-space: nowrap; }
th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--table-border); font-size: 13px; }
th { background: var(--table-header-bg); font-weight: 600; color: var(--text-secondary); }
tr:hover td { background: var(--table-row-hover); }
.actions { display: flex; gap: 6px; }
.url-cell { max-width: 200px; overflow: hidden; text-overflow: ellipsis; }

.badge-ok { color: var(--success); font-weight: 600; }
.badge-off { color: var(--text-muted); }

.error-state { text-align: center; padding: 60px 20px; }
.error-icon { font-size: 48px; }
.error-state p { color: var(--text-muted); margin: 12px 0 20px; }
.retry-btn { padding: 8px 24px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: 14px; transition: opacity var(--transition-fast); }
.retry-btn:hover { opacity: 0.9; }
.empty { text-align: center; color: var(--text-muted); padding: 60px 0; }

.btn-sm { padding: 4px 10px; font-size: 12px; border: 1px solid var(--input-border); border-radius: var(--radius-xs); background: var(--bg-card); color: var(--text-primary); cursor: pointer; transition: border-color var(--transition-fast), color var(--transition-fast); }
.btn-sm:hover { border-color: var(--brand); color: var(--brand); }
.btn-sm.danger { color: var(--danger); border-color: var(--danger); }
.btn-sm.danger:hover { background: var(--danger); color: #fff; }

.modal-overlay { position: fixed; inset: 0; background: var(--modal-overlay); z-index: 5000; display: flex; align-items: center; justify-content: center; animation: overlay-fade-in var(--transition-base); }
.modal { background: var(--bg-card); border-radius: var(--modal-radius); padding: var(--modal-padding); width: 90%; max-width: 520px; max-height: 80vh; overflow-y: auto; box-shadow: var(--modal-shadow); animation: modal-enter var(--transition-slow); }
.modal h3 { font-size: 17px; font-weight: 600; margin-bottom: 20px; color: var(--text-primary); }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-grid label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: var(--text-secondary); }
.form-grid label.full { grid-column: 1 / -1; }
.form-grid input, .form-grid select { padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.form-grid input:focus, .form-grid select:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
.btn-cancel { padding: 8px 20px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 13px; transition: border-color var(--transition-fast); }
.btn-cancel:hover { border-color: var(--text-muted); }
.btn-save { padding: 8px 20px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; transition: opacity var(--transition-fast); }
.btn-save:hover { opacity: 0.9; }
.btn-save:disabled { opacity: .5; cursor: not-allowed; }
</style>
