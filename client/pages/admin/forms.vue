<template>
  <AdminLayout>
    <div class="page-header">
      <h1>{{ $t('admin_forms.page_title') }}</h1>
      <button class="btn-primary" @click="openCreate">{{ $t('admin_forms.new_form') }}</button>
    </div>

    <div class="toolbar">
      <input v-model="keyword" type="text" :placeholder="$t('admin_forms.search_placeholder')" @keyup.enter="search" />
      <select v-model="filterStatus" class="sel" @change="search">
        <option value="">{{ $t('admin_forms.all_statuses') }}</option>
        <option value="1">{{ $t('common.enable') }}</option>
        <option value="0">{{ $t('common.banned') }}</option>
      </select>
      <button class="btn" @click="search">{{ $t('common.search') }}</button>
    </div>

    <LoadingSkeleton v-if="loading" type="table" :rows="5" :cols="7" />

    <div v-else-if="error" class="error-state">
      <span class="error-icon">⚠️</span>
      <p>{{ error }}</p>
      <button class="retry-btn" @click="fetchData">{{ $t('common.retry') }}</button>
    </div>

    <template v-else-if="list.length">
      <div class="table-wrap">
        <table>
          <thead><tr><th>{{ $t('common.id') }}</th><th>{{ $t('admin_forms.col_title') }}</th><th>{{ $t('admin_forms.col_code') }}</th><th>{{ $t('admin_forms.col_submissions') }}</th><th>{{ $t('admin_forms.col_validity') }}</th><th>{{ $t('common.status') }}</th><th>{{ $t('common.action') }}</th></tr></thead>
          <tbody>
            <tr v-for="f in list" :key="f.id">
              <td>{{ f.id }}</td><td>{{ f.title }}</td><td>{{ f.form_code }}</td>
              <td>{{ f.submit_count }}/{{ f.submit_limit || '∞' }}</td>
              <td>{{ f.start_time || $t('admin_forms.unlimited') }} ~ {{ f.end_time || $t('admin_forms.unlimited') }}</td>
              <td><span :class="f.status===1?'badge-ok':'badge-off'">{{ f.status === 1 ? $t('common.enable') : $t('common.banned') }}</span></td>
              <td class="actions">
                <button class="btn-sm" @click="showSubs(f)">{{ $t('admin_forms.submit_records') }}</button>
                <button class="btn-sm" @click="editForm(f)">{{ $t('common.edit') }}</button>
                <button class="btn-sm danger" @click="delForm(f.id)">{{ $t('common.delete') }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Pagination :page="page" :page-size="pageSize" :total="total" @change="onPageChange" />
    </template>
    <div v-else class="empty">{{ $t('admin_forms.no_data') }}</div>

    <div v-if="subsOpen" class="subs-panel">
      <div class="subs-header">
        <h2>{{ $t('admin_forms.submissions_title', { title: activeFormTitle }) }}</h2>
        <button class="btn-cancel" @click="subsOpen = false">{{ $t('common.close') }}</button>
      </div>
      <LoadingSkeleton v-if="subsLoading" type="table" :rows="3" :cols="5" />
      <template v-else-if="submissions.length">
        <table>
          <thead><tr><th>{{ $t('common.id') }}</th><th>{{ $t('admin_forms.col_data') }}</th><th>{{ $t('admin_forms.col_user') }}</th><th>{{ $t('common.status') }}</th><th>{{ $t('admin_forms.col_submit_time') }}</th></tr></thead>
          <tbody>
            <tr v-for="s in submissions" :key="s.id">
              <td>{{ s.id }}</td>
              <td class="data-cell">{{ s.data_json }}</td>
              <td>{{ s.ip }}</td>
              <td><span :class="['badge-pending','badge-ok','badge-done'][s.status]">{{ subStatusText(s.status) }}</span></td>
              <td>{{ s.create_time }}</td>
            </tr>
          </tbody>
        </table>
      </template>
      <div v-else class="empty-sm">{{ $t('admin_forms.no_data') }}</div>
    </div>

    <Teleport to="body">
      <div v-if="modalOpen" class="modal-overlay" @click.self="modalOpen = false" @keydown.escape="modalOpen = false">
        <div class="modal">
          <h3>{{ isEdit ? $t('admin_forms.edit_modal') : $t('admin_forms.create_modal') }}</h3>
          <div class="form-grid">
            <label class="full">{{ $t('admin_forms.label_title') }} <input v-model="form.title" maxlength="100" :placeholder="$t('admin_forms.label_title')" /></label>
            <label>{{ $t('admin_forms.label_code') }} <input v-model="form.form_code" maxlength="50" :placeholder="$t('admin_forms.label_code')" /></label>
            <label>{{ $t('admin_forms.label_limit') }} <input v-model.number="form.submit_limit" type="number" min="0" :placeholder="$t('admin_forms.no_limit')" /></label>
            <label>{{ $t('admin_forms.label_start') }} <input v-model="form.start_time" type="datetime-local" /></label>
            <label>{{ $t('admin_forms.label_end') }} <input v-model="form.end_time" type="datetime-local" /></label>
            <label>{{ $t('common.status') }}
              <select v-model="form.status">
                <option :value="1">{{ $t('common.enable') }}</option>
                <option :value="0">{{ $t('common.banned') }}</option>
              </select>
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

<script setup lang="ts">

const { t } = useI18n()
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

const submissions = ref<any[]>([])
const subsOpen = ref(false)
const subsLoading = ref(false)
const activeFormTitle = ref('')

const SUB_STATUS_TEXTS = [
  t('admin_forms.status_pending'),
  t('admin_forms.status_viewed'),
  t('admin_forms.status_processed'),
]

function subStatusText(s: number) {
  return SUB_STATUS_TEXTS[s] || t('admin_forms.unknown')
}

const toast = useToast()

onMounted(fetchData)

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams({ page: String(page.value), pageSize: String(pageSize), keyword: keyword.value })
    if (filterStatus.value) params.set('status', filterStatus.value)
    const res: any = await $fetch(`/api/forms/admin?${params.toString()}`, { credentials: 'include' })
    if (res?.code === 200) {
      list.value = res.data?.list || []
      total.value = res.data?.total || 0
    } else {
      list.value = res.data?.list || res.data || []
      total.value = list.value.length
    }
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string };
    error.value = err?.data?.msg || err.message || t('admin_forms.load_failed')
    toast.error(error.value)
  } finally {
    loading.value = false
  }
}

function search() { page.value = 1; fetchData() }
function onPageChange(p: number) { page.value = p; fetchData() }

function openCreate() {
  isEdit.value = false
  form.value = { title: '', form_code: '', submit_limit: 0, start_time: '', end_time: '', status: 1 }
  modalOpen.value = true
}

function editForm(f: any) {
  isEdit.value = true
  form.value = { ...f, start_time: f.start_time?.slice(0, 16) || '', end_time: f.end_time?.slice(0, 16) || '' }
  modalOpen.value = true
}

async function save() {
  saving.value = true
  try {
    const url = isEdit.value ? `/api/forms/admin/${form.value.id}` : '/api/forms/admin'
    const method = isEdit.value ? 'PUT' : 'POST'
    const res: any = await $fetch(url, { method, body: form.value, credentials: 'include' })
    if (res?.code === 200 || res?.code === 0) {
      toast.success(isEdit.value ? t('admin_forms.form_updated') : t('admin_forms.form_created'))
      modalOpen.value = false
      fetchData()
    } else {
      toast.error(res?.msg || t('admin_forms.save_failed'))
    }
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string };
    toast.error(err?.data?.msg || err.message || t('admin_forms.save_failed'))
  } finally {
    saving.value = false
  }
}

async function showSubs(f: any) {
  activeFormTitle.value = f.title
  subsOpen.value = true
  subsLoading.value = true
  try {
    const res: any = await $fetch(`/api/forms/admin/${f.id}/submissions`, { credentials: 'include' })
    submissions.value = res.data?.list || []
  } catch (e: unknown) {
    toast.error(t('admin_forms.load_sub_failed'))
  } finally {
    subsLoading.value = false
  }
}

async function delForm(id: number) {
  if (!await confirm({ message: t('admin_forms.delete_confirm') })) return
  try {
    const res: any = await $fetch(`/api/forms/admin/${id}`, { method: 'DELETE', credentials: 'include' })
    if (res?.code === 200 || res?.code === 0) {
      toast.success(t('admin_forms.form_deleted'))
      fetchData()
    } else {
      toast.error(res?.msg || t('common.failed_delete'))
    }
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string };
    toast.error(err?.data?.msg || err.message || t('common.failed_delete'))
  }
}
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
h1 { font-size: 20px; font-weight: 700; color: var(--text-primary); }
h2 { font-size: 16px; font-weight: 600; color: var(--text-primary); }
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
.data-cell { max-width: 300px; overflow: hidden; text-overflow: ellipsis; }

.badge-ok { color: var(--success); font-weight: 600; }
.badge-off { color: var(--text-muted); }
.badge-pending { color: var(--warning); font-weight: 600; }
.badge-done { color: var(--brand); font-weight: 600; }

.error-state { text-align: center; padding: 60px 20px; }
.error-icon { font-size: 48px; }
.error-state p { color: var(--text-muted); margin: 12px 0 20px; }
.retry-btn { padding: 8px 24px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: 14px; transition: opacity var(--transition-fast); }
.retry-btn:hover { opacity: 0.9; }
.empty { text-align: center; color: var(--text-muted); padding: 60px 0; }
.empty-sm { text-align: center; color: var(--text-muted); padding: 30px 0; }

.subs-panel { margin-top: 30px; background: var(--bg-card); border-radius: var(--radius-lg); padding: 20px; border: 1px solid var(--border-light); }
.subs-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }

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
