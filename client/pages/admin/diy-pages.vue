<template>
  <AdminLayout>
    <div class="page-header">
      <h1>{{ $t('admin_diy_pages.page_title') }}</h1>
      <button class="btn-primary" @click="openCreate">+ {{ $t('admin_diy_pages.new_page') }}</button>
    </div>

    <div class="toolbar">
      <input v-model="keyword" class="input-search" :placeholder="$t('admin_diy_pages.search_placeholder')" @keyup.enter="search" :aria-label="$t('admin_diy_pages.search_placeholder')" />
      <select v-model="filterType" class="sel" @change="search" :aria-label="$t('admin_diy_pages.col_type')">
        <option value="">{{ $t('admin_diy_pages.all_types') }}</option>
        <option value="landing">{{ $t('admin_diy_pages.type_landing') }}</option>
        <option value="detail">{{ $t('admin_diy_pages.type_detail') }}</option>
        <option value="activity">{{ $t('admin_diy_pages.type_activity') }}</option>
        <option value="custom">{{ $t('admin_diy_pages.type_custom') }}</option>
      </select>
      <select v-model="filterStatus" class="sel" @change="search" :aria-label="$t('admin_diy_pages.all_statuses')">
        <option value="">{{ $t('admin_diy_pages.all_statuses') }}</option>
        <option value="1">{{ $t('admin_diy_pages.status_published') }}</option>
        <option value="0">{{ $t('admin_diy_pages.status_draft') }}</option>
      </select>
      <div v-if="selectedIds.length > 0" class="batch-actions">
        <button class="btn-batch" @click="batchPublish">{{ $t('admin_diy_pages.batch_publish') }}</button>
        <button class="btn-batch" @click="batchUnpublish">{{ $t('admin_diy_pages.batch_unpublish') }}</button>
        <button class="btn-batch btn-danger" @click="batchDelete">{{ $t('admin_diy_pages.batch_delete') }}</button>
      </div>
    </div>

    <LoadingSkeleton v-if="loading" type="table" :rows="5" :cols="7" />

    <div v-else-if="error" class="error-state">
      <span class="error-icon">⚠️</span>
      <p>{{ error }}</p>
      <button class="retry-btn" @click="fetchData">{{ $t('common.retry') }}</button>
    </div>

    <div class="table-wrap" v-else-if="list.length">
      <table class="table">
        <thead>
          <tr>
            <th class="col-cb"><input type="checkbox" :checked="allSelected" @change="toggleAll" :aria-label="$t('common.action')" /></th>
            <th>ID</th><th>{{ $t('admin_diy_pages.col_title') }}</th><th>{{ $t('admin_diy_pages.col_slug') }}</th><th>{{ $t('admin_diy_pages.col_type') }}</th><th>{{ $t('common.status') }}</th><th>{{ $t('admin_diy_pages.col_update_time') }}</th><th>{{ $t('common.action') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in list" :key="p.id">
            <td class="col-cb"><input type="checkbox" :value="p.id" v-model="selectedIds" /></td>
            <td>{{ p.id }}</td>
            <td>{{ p.title || p.name }}</td>
            <td><code class="slug">{{ p.slug }}</code></td>
            <td>{{ p.page_type || '-' }}</td>
            <td>
              <span v-if="p.is_published || p.status === 1" class="badge-success">{{ $t('admin_diy_pages.status_published') }}</span>
              <span v-else class="badge-draft">{{ $t('admin_diy_pages.status_draft') }}</span>
            </td>
            <td>{{ formatDate(p.updated_at || p.update_time) }}</td>
            <td class="actions">
              <a :href="`/diy/editor?id=${p.id}`" class="btn-sm" target="_blank" rel="noopener noreferrer" :aria-label="$t('admin_diy_pages.edit')">{{ $t('admin_diy_pages.edit') }}</a>
              <a :href="`/diy/preview?slug=${p.slug}`" class="btn-sm" target="_blank" rel="noopener noreferrer" :aria-label="$t('admin_diy_pages.preview')">{{ $t('admin_diy_pages.preview') }}</a>
              <button class="btn-sm" @click="toggleStatus(p)" :aria-label="(p.is_published || p.status === 1) ? $t('admin_diy_pages.unpublish') : $t('admin_diy_pages.publish')">{{ (p.is_published || p.status === 1) ? $t('admin_diy_pages.unpublish') : $t('admin_diy_pages.publish') }}</button>
              <button class="btn-sm btn-danger" @click="deleteItem(p.id)" :aria-label="$t('admin_diy_pages.delete')">{{ $t('admin_diy_pages.delete') }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <EmptyState v-else :icon="$t('admin_diy_pages.empty_icon')" :title="$t('admin_diy_pages.empty_title')" :description="$t('admin_diy_pages.empty_desc')" :action-label="$t('admin_diy_pages.empty_action')" @action="openCreate" />

    <Pagination v-if="total > pageSize" :page="page" :page-size="pageSize" :total="total" @change="onPageChange" />

    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="showModal = false" @keydown.escape="showModal = false">
        <div class="modal">
          <h3>{{ editing ? $t('admin_diy_pages.edit_modal') : $t('admin_diy_pages.create_modal') }}</h3>
          <div class="form-grid">
            <label class="full">{{ $t('admin_diy_pages.label_title') }} <input v-model="editForm.title" maxlength="100" class="input" :placeholder="$t('admin_diy_pages.title_placeholder')" /></label>
            <label>{{ $t('admin_diy_pages.label_slug') }} <input v-model="editForm.slug" maxlength="50" class="input" :placeholder="$t('admin_diy_pages.slug_placeholder')" :disabled="!!editing" /></label>
            <label>{{ $t('admin_diy_pages.label_type') }}
              <select v-model="editForm.pageType" class="input" :disabled="!!editing">
                <option value="landing">{{ $t('admin_diy_pages.type_landing') }}</option>
                <option value="detail">{{ $t('admin_diy_pages.type_detail') }}</option>
                <option value="activity">{{ $t('admin_diy_pages.type_activity') }}</option>
                <option value="custom">{{ $t('admin_diy_pages.type_custom') }}</option>
              </select>
            </label>
          </div>
          <div class="form-group"><label>{{ $t('admin_diy_pages.label_desc') }}</label><textarea v-model="editForm.description" maxlength="500" class="input" rows="2" /></div>
          <div class="modal-actions">
            <button class="btn-cancel" @click="showModal = false">{{ $t('common.cancel') }}</button>
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
import { formatDate } from '~/utils/format'

const toast = useToast()
const list = ref<any[]>([])
const loading = ref(true)
const error = ref('')
const keyword = ref('')
const filterType = ref('')
const filterStatus = ref('')
const page = ref(1)
const pageSize = 15
const total = ref(0)
const selectedIds = ref<number[]>([])
const saving = ref(false)
const showModal = ref(false)
const editing = ref<any>(null)
const editForm = reactive({ title: '', slug: '', pageType: 'landing', description: '' })

const allSelected = computed(() => list.value.length > 0 && selectedIds.value.length === list.value.length)

function toggleAll() {
  if (allSelected.value) selectedIds.value = []
  else selectedIds.value = list.value.map(p => p.id)
}

function search() { page.value = 1; fetchData() }
function onPageChange(p: number) { page.value = p; fetchData() }

onMounted(fetchData)

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams({ page: String(page.value), pageSize: String(pageSize) })
    if (keyword.value) params.set('keyword', keyword.value)
    if (filterType.value) params.set('pageType', filterType.value)
    if (filterStatus.value !== '') params.set('status', filterStatus.value)
    const qs = params.toString()
    const data: any = await $fetch(`/api/diy?${qs}`, { credentials: 'include' })
    list.value = data?.data?.list || data?.data || []
    if (!Array.isArray(list.value)) list.value = []
    total.value = data?.data?.total || list.value.length
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string };
    error.value = err?.data?.msg || err.message || t('admin_diy_pages.load_failed')
    toast.error(error.value)
  } finally {
    loading.value = false
  }
}

function openCreate() { editing.value = null; editForm.title = ''; editForm.slug = ''; editForm.pageType = 'landing'; editForm.description = ''; showModal.value = true }
function openEdit(p: any) { editing.value = p; editForm.title = p.title || p.name || ''; editForm.slug = p.slug || ''; editForm.pageType = p.page_type || 'landing'; editForm.description = p.description || ''; showModal.value = true }

async function save() {
  saving.value = true
  try {
    if (editing.value) {
      await $fetch(`/api/diy/${editing.value.id}`, { method: 'PUT', credentials: 'include', body: editForm })
    } else {
      const res: any = await $fetch('/api/diy', { method: 'POST', credentials: 'include', body: editForm })
      if (res?.data?.id) {
        showModal.value = false; navigateTo(`/diy/editor?id=${res.data.id}`, { open: { target: '_blank' } } as any); return
      }
    }
    showModal.value = false; fetchData()
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || t('admin_diy_pages.save_failed')) }
  saving.value = false
}

async function toggleStatus(p: any) {
  const isPublished = (p.is_published || p.status === 1)
  try {
    if (isPublished) {
      await $fetch(`/api/diy/${p.id}/unpublish`, { method: 'POST', credentials: 'include' })
    } else {
      await $fetch(`/api/diy/${p.id}/publish`, { method: 'POST', credentials: 'include' })
    }
    fetchData()
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || t('admin_diy_pages.op_failed')) }
}

async function deleteItem(id: number) {
  if (!await confirm({ message: t('admin_diy_pages.delete_confirm') })) return
  try {
    await $fetch(`/api/diy/${id}/hard-delete`, { method: 'DELETE', credentials: 'include' })
    selectedIds.value = selectedIds.value.filter(i => i !== id)
    fetchData()
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || t('common.delete_failed')) }
}

async function batchPublish() {
  if (!selectedIds.value.length) return
  try {
    await $fetch('/api/diy/batch/publish', { method: 'POST', credentials: 'include', body: { ids: selectedIds.value } })
    toast.success(t('admin_diy_pages.batch_publish_success', { count: selectedIds.value.length }))
    selectedIds.value = []; fetchData()
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || t('admin_diy_pages.batch_publish_failed')) }
}

async function batchUnpublish() {
  if (!selectedIds.value.length) return
  try {
    await $fetch('/api/diy/batch/unpublish', { method: 'POST', credentials: 'include', body: { ids: selectedIds.value } })
    toast.success(t('admin_diy_pages.batch_unpublish_success', { count: selectedIds.value.length }))
    selectedIds.value = []; fetchData()
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || t('admin_diy_pages.batch_unpublish_failed')) }
}

async function batchDelete() {
  if (!selectedIds.value.length) return
  if (!await confirm({ message: t('admin_diy_pages.batch_delete_confirm', { count: selectedIds.value.length }) })) return
  try {
    await $fetch('/api/diy/batch/delete', { method: 'POST', credentials: 'include', body: { ids: selectedIds.value } })
    toast.success(t('admin_diy_pages.batch_delete_success', { count: selectedIds.value.length }))
    selectedIds.value = []; fetchData()
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || t('admin_diy_pages.batch_delete_failed')) }
}
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
h1 { font-size: 20px; font-weight: 700; color: var(--text-primary); }
.btn-primary { padding: 8px 20px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: 13px; transition: opacity var(--transition-fast); }
.btn-primary:hover { opacity: 0.9; }

.toolbar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
.input-search { flex: 1; min-width: 160px; max-width: 280px; padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast); }
.input-search:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.sel { padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--bg-card); color: var(--text-primary); outline: none; }
.sel:focus { border-color: var(--input-focus-border); }

.batch-actions { display: flex; gap: 6px; align-items: center; margin-left: auto; }
.btn-batch { padding: 6px 14px; border: 1px solid var(--brand); border-radius: var(--radius-sm); background: var(--brand-light); color: var(--brand); cursor: pointer; font-size: 12px; transition: background var(--transition-fast), color var(--transition-fast); }
.btn-batch:hover { background: var(--brand); color: #fff; }
.btn-batch.btn-danger { border-color: var(--danger); background: var(--danger-light, #fef2f2); color: var(--danger); }
.btn-batch.btn-danger:hover { background: var(--danger); color: #fff; }

.error-state { text-align: center; padding: 60px 20px; }
.error-icon { font-size: 48px; }
.error-state p { color: var(--text-muted); margin: 12px 0 20px; }
.retry-btn { padding: 8px 24px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: 14px; }

.table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.table { width: 100%; border-collapse: collapse; background: var(--bg-card); border-radius: var(--radius-lg); overflow: hidden; white-space: nowrap; font-size: 13px; }
.table th, .table td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--table-border); }
.table th { color: var(--text-secondary); font-weight: 500; font-size: 12px; background: var(--table-header-bg); }
tr:hover td { background: var(--table-row-hover); }
.col-cb { width: 36px; text-align: center; }
.slug { font-size: 12px; color: var(--text-muted); background: var(--tag-bg); padding: 2px 6px; border-radius: var(--radius-xs); }
.badge-success { display: inline-block; padding: 2px 10px; border-radius: var(--badge-radius); font-size: var(--badge-font-size); background: var(--status-done-bg); color: var(--status-done-text); }
.badge-draft { display: inline-block; padding: 2px 10px; border-radius: var(--badge-radius); font-size: var(--badge-font-size); background: var(--bg-hover); color: var(--text-muted); }
.actions { display: flex; gap: 4px; }
.btn-sm { padding: 4px 10px; border: 1px solid var(--input-border); border-radius: var(--radius-xs); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 12px; text-decoration: none; display: inline-block; transition: border-color var(--transition-fast), color var(--transition-fast); }
.btn-sm:hover { border-color: var(--brand); color: var(--brand); }
.btn-danger { color: var(--danger); border-color: var(--danger); }
.btn-danger:hover { background: var(--danger); color: #fff; }

.modal-overlay { position: fixed; inset: 0; background: var(--modal-overlay); z-index: 5000; display: flex; align-items: center; justify-content: center; animation: overlay-fade-in var(--transition-base); }
.modal { background: var(--bg-card); border-radius: var(--modal-radius); padding: var(--modal-padding); width: 90%; max-width: 480px; max-height: 80vh; overflow-y: auto; box-shadow: var(--modal-shadow); animation: modal-enter var(--transition-slow); }
.modal h3 { font-size: 17px; font-weight: 600; margin-bottom: 20px; color: var(--text-primary); }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
.form-grid label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: var(--text-secondary); }
.form-grid label.full { grid-column: 1 / -1; }
.form-group { margin-bottom: 14px; }
.form-group label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: var(--text-secondary); }
.input { padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; width: 100%; transition: border-color var(--transition-fast); resize: vertical; }
.input:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.input:disabled { opacity: 0.6; cursor: not-allowed; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
.btn-cancel { padding: 8px 20px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 13px; }
.btn-cancel:hover { border-color: var(--text-muted); }
.btn-save { padding: 8px 20px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; }
.btn-save:hover { opacity: 0.9; }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
