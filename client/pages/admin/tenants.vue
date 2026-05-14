<template>
  <AdminLayout>
    <div class="page-header">
      <h1>{{ $t('admin_tenants.page_title') }}</h1>
      <button class="btn-primary" @click="openCreate">{{ $t('admin_tenants.new_tenant') }}</button>
    </div>

    <div class="toolbar">
      <input v-model="keyword" type="text" maxlength="100" :placeholder="$t('admin_tenants.search_placeholder')" @keyup.enter="search" />
      <select v-model="filterStatus" class="sel" @change="search">
        <option value="">{{ $t('common.all_status') }}</option>
        <option value="1">{{ $t('common.enable') }}</option>
        <option value="0">{{ $t('common.disable') }}</option>
      </select>
      <select v-model="filterReviewStatus" class="sel" @change="search">
        <option value="">{{ $t('common.all_audit') }}</option>
        <option value="pending">{{ $t('enterprise.common.statusPending') }}</option>
        <option value="under_review">{{ $t('enterprise.common.statusInReview') }}</option>
        <option value="approved">{{ $t('enterprise.common.statusActive') }}</option>
        <option value="rejected">{{ $t('enterprise.common.statusRejected') }}</option>
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
          <thead><tr><th>ID</th><th>{{ $t('admin_tenants.name') }}</th><th>{{ $t('admin_tenants.code') }}</th><th>{{ $t('admin_tenants.plan') }}</th><th>{{ $t('admin_tenants.quota_header') }}</th><th>{{ $t('admin_tenants.members_header') }}</th><th>{{ $t('admin_tenants.expire_header') }}</th><th>{{ $t('common.audit_status') }}</th><th>{{ $t('common.status') }}</th><th>{{ $t('common.action') }}</th></tr></thead>
          <tbody>
            <tr v-for="t in list" :key="t.id">
              <td>{{ t.id }}</td><td>{{ t.name }}</td><td>{{ t.code }}</td>
              <td>{{ t.plan_type }}</td><td>{{ t.quota_images }}/{{ t.quota_video }}</td>
              <td>{{ t.max_users }}</td><td>{{ t.expire_time || $t('admin_tenants.unlimited') }}</td>
              <td><span :class="reviewBadgeClass(t.review_status)">{{ reviewLabel(t.review_status) }}</span></td>
              <td><span :class="t.status===1?'badge-ok':'badge-off'">{{ t.status===1 ? $t('common.enable') : $t('common.disable') }}</span></td>
              <td class="actions">
                <button v-if="t.review_status==='pending'||t.review_status==='under_review'" class="btn-sm ok" @click="openReview(t)">{{ $t('common.audit_status') }}</button>
                <button class="btn-sm" @click="openEdit(t)">{{ $t('common.edit') }}</button>
                <button class="btn-sm" :class="t.status===1?'danger':''" @click="toggleStatus(t)">{{ t.status===1 ? $t('common.disable') : $t('common.enable') }}</button>
                <button class="btn-sm danger" @click="delTenant(t.id)">{{ $t('common.delete') }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Pagination :page="page" :page-size="pageSize" :total="total" @change="onPageChange" />
    </template>
    <div v-else class="empty">{{ $t('admin_tenants.no_data') }}</div>

    <Teleport to="body">
      <div v-if="reviewModal" class="modal-overlay" @click.self="reviewModal = false" @keydown.escape="reviewModal = false">
        <div class="modal">
          <h3>{{ $t('admin_tenants.review_title') }}</h3>
          <div class="review-info">
            <p><strong>{{ reviewTarget?.name }}</strong>（{{ reviewTarget?.code }}）</p>
            <p>{{ $t('admin_tenants.plan') }}：{{ reviewTarget?.plan_type }} | {{ $t('enterprise.common.statusPending') }}：<span :class="reviewBadgeClass(reviewTarget?.review_status)">{{ reviewLabel(reviewTarget?.review_status) }}</span></p>
          </div>
          <label class="review-label">{{ $t('admin_tenants.review_remark_label') }}<textarea v-model="reviewRemark" maxlength="500" rows="3" :placeholder="$t('admin_tenants.review_remark_placeholder')" /></label>
          <div class="modal-actions">
            <button class="btn-cancel" @click="reviewModal = false">{{ $t('common.cancel') }}</button>
            <button class="btn-save danger" :disabled="reviewing" @click="doReview('rejected')">{{ reviewing ? $t('admin_tenants.submitting') : $t('admin_tenants.reject') }}</button>
            <button class="btn-save" :disabled="reviewing" @click="doReview('approved')">{{ reviewing ? $t('admin_tenants.submitting') : $t('admin_tenants.approve') }}</button>
          </div>
        </div>
      </div>
    </Teleport>
    <Teleport to="body">
      <div v-if="modalOpen" class="modal-overlay" @click.self="modalOpen = false" @keydown.escape="modalOpen = false">
        <div class="modal">
          <h3>{{ isEdit ? $t('admin_tenants.edit_tenant') : $t('admin_tenants.new_tenant_modal') }}</h3>
          <div class="form-grid">
            <label>{{ $t('admin_tenants.name') }} <input v-model="form.name" maxlength="100" :placeholder="$t('admin_tenants.company_placeholder')" /></label>
            <label>{{ $t('admin_tenants.code') }} <input v-model="form.code" maxlength="50" :placeholder="$t('admin_tenants.code_placeholder')" /></label>
            <label>{{ $t('admin_tenants.plan') }}
              <select v-model="form.plan_type">
                <option value="free">{{ $t('admin_tenants.plan_free') }}</option>
                <option value="pro">{{ $t('admin_tenants.plan_pro') }}</option>
                <option value="enterprise">{{ $t('admin_tenants.plan_enterprise') }}</option>
              </select>
            </label>
            <label>{{ $t('admin_tenants.image_quota') }} <input v-model.number="form.quota_images" type="number" min="0" /></label>
            <label>{{ $t('admin_tenants.video_quota') }} <input v-model.number="form.quota_video" type="number" min="0" /></label>
            <label>{{ $t('admin_tenants.max_users') }} <input v-model.number="form.max_users" type="number" min="0" /></label>
            <label>{{ $t('admin_tenants.expire_time') }} <input v-model="form.expire_time" type="date" /></label>
            <label>{{ $t('common.status') }}
              <select v-model="form.status">
                <option :value="1">{{ $t('common.enable') }}</option>
                <option :value="0">{{ $t('common.disable') }}</option>
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

const { confirm } = useConfirm()
const { t } = useI18n()
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 15
const keyword = ref('')
const filterReviewStatus = ref('')
const filterStatus = ref('')
const loading = ref(true)
const error = ref('')
const saving = ref(false)
const modalOpen = ref(false)
const reviewModal = ref(false)
const reviewing = ref(false)
const reviewTarget = ref<any>(null)
const reviewRemark = ref('')
const isEdit = ref(false)
const form = ref<any>({})

const toast = useToast()

onMounted(fetchData)

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams({ page: String(page.value), pageSize: String(pageSize), keyword: keyword.value })
    if (filterStatus.value !== '') params.set('status', filterStatus.value)
    if (filterReviewStatus.value) params.set('reviewStatus', filterReviewStatus.value)
    const res: any = await $fetch(`/api/tenants?${params.toString()}`, { credentials: 'include' })
    if (res?.code === 200) {
      list.value = res.data?.list || []
      total.value = res.data?.total || 0
    } else {
      list.value = res.data || []
      total.value = list.value.length
    }
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string };
    error.value = err?.data?.msg || err.message || t('common.loadFail')
    toast.error(error.value)
  } finally {
    loading.value = false
  }
}

function search() { page.value = 1; fetchData() }
function onPageChange(p: number) { page.value = p; fetchData() }

function openCreate() {
  isEdit.value = false
  form.value = { name: '', code: '', plan_type: 'free', quota_images: 100, quota_video: 10, max_users: 5, expire_time: '', status: 1 }
  modalOpen.value = true
}

function openEdit(t: any) {
  isEdit.value = true
  form.value = { ...t, expire_time: t.expire_time?.slice(0, 10) || '' }
  modalOpen.value = true
}

async function save() {
  saving.value = true
  try {
    const url = isEdit.value ? `/api/tenants/${form.value.id}` : '/api/tenants'
    const method = isEdit.value ? 'PUT' : 'POST'
    const res: any = await $fetch(url, { method, body: form.value, credentials: 'include' })
    if (res?.code === 200 || res?.code === 0) {
      toast.success(t('common.success_save'))
      modalOpen.value = false
      fetchData()
    } else {
      toast.error(res?.msg || t('common.failed_save'))
    }
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string };
    toast.error(err?.data?.msg || err.message || t('common.failed_save'))
  } finally {
    saving.value = false
  }
}

async function delTenant(id: number) {
  if (!await confirm({ message: t('common.confirm_delete'), variant: 'danger' })) return
  try {
    const res: any = await $fetch(`/api/tenants/${id}`, { method: 'DELETE', credentials: 'include' })
    if (res?.code === 200 || res?.code === 0) {
      toast.success(t('common.delete_success'))
      fetchData()
    } else {
      toast.error(res?.msg || t('common.failed_delete'))
    }
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string };
    toast.error(err?.data?.msg || err.message || t('common.failed_delete'))
  }
}

async function toggleStatus(t: any) {
  const newStatus = t.status === 1 ? 0 : 1
  try {
    const res: any = await $fetch(`/api/tenants/${t.id}`, { method: 'PUT', body: { status: newStatus }, credentials: 'include' })
    if (res?.code === 200 || res?.code === 0) {
      toast.success(t('common.success_save'))
      fetchData()
    } else {
      toast.error(res?.msg || t('common.failed_save'))
    }
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string };
    toast.error(err?.data?.msg || err.message || t('common.failed_save'))
  }
}

function openReview(t: any) {
  reviewTarget.value = t
  reviewRemark.value = ''
  reviewModal.value = true
}

function reviewBadgeClass(status: string) {
  const map: Record<string, string> = { pending: 'badge-pending', under_review: 'badge-reviewing', approved: 'badge-ok', rejected: 'badge-off' }
  return map[status] || ''
}

function reviewLabel(status: string) {
  const map: Record<string, string> = {
    pending: t('enterprise.common.statusPending'),
    under_review: t('enterprise.common.statusInReview'),
    approved: t('enterprise.common.statusActive'),
    rejected: t('enterprise.common.statusRejected'),
  }
  return map[status] || status
}

async function doReview(decision: string) {
  if (!reviewTarget.value) return
  reviewing.value = true
  try {
    const res: any = await $fetch(`/api/tenants/${reviewTarget.value.id}/review`, {
      method: 'POST',
      body: { decision, remark: reviewRemark.value },
      credentials: 'include',
    })
    if (res?.code === 200 || res?.code === 0) {
      toast.success(t('common.success_save'))
      reviewModal.value = false
      fetchData()
    } else {
      toast.error(res?.msg || t('common.failed_save'))
    }
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string };
    toast.error(err?.data?.msg || err.message || t('common.failed_save'))
  } finally {
    reviewing.value = false
  }
}
definePageMeta({ layout: 'platform-admin', middleware: ['auth'] })
</script>

<style scoped>
/* keeping original styles */
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-header h1 { margin: 0; font-size: 22px; }
.toolbar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.toolbar input { padding: 6px 12px; border: 1px solid var(--border-light); border-radius: var(--radius-md); font-size: 13px; background: var(--bg-input); color: var(--text-primary); }
.sel { padding: 6px 12px; border: 1px solid var(--border-light); border-radius: var(--radius-md); font-size: 13px; background: var(--bg-input); color: var(--text-primary); }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid var(--border-light); }
th { background: var(--bg-hover); font-weight: 600; font-size: 12px; color: var(--text-secondary); }
.actions { display: flex; gap: 4px; }
.btn-sm { padding: 4px 10px; border: 1px solid var(--border-light); border-radius: var(--radius-sm); font-size: 12px; cursor: pointer; background: var(--bg-card); color: var(--text-secondary); }
.btn-sm:hover { border-color: var(--brand); color: var(--brand); }
.btn-sm.danger { color: var(--danger, #ef4444); border-color: var(--danger, #ef4444); }
.btn-sm.ok { color: var(--success, #10b981); border-color: var(--success, #10b981); }
.badge-ok { color: var(--success, #10b981); }
.badge-off { color: var(--danger, #ef4444); }
.badge-pending { color: var(--warning, #f59e0b); }
.badge-reviewing { color: var(--brand); }
.error-state { text-align: center; padding: 40px; }
.empty { text-align: center; padding: 40px; color: var(--text-muted); }
.error-icon { font-size: 24px; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 500; display: flex; align-items: center; justify-content: center; }
.modal { background: var(--bg-card); padding: 24px; border-radius: var(--radius-lg); min-width: 420px; max-width: 90vw; }
.modal h3 { margin: 0 0 16px; }
.form-grid { display: flex; flex-direction: column; gap: 12px; }
.form-grid label { font-size: 13px; color: var(--text-secondary); display: flex; flex-direction: column; gap: 4px; }
.form-grid input, .form-grid select { padding: 6px 10px; border: 1px solid var(--border-light); border-radius: var(--radius-md); font-size: 13px; background: var(--bg-input); color: var(--text-primary); }
.review-info { margin-bottom: 12px; font-size: 13px; }
.review-label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: var(--text-secondary); margin-bottom: 12px; }
.review-label textarea { padding: 8px; border: 1px solid var(--border-light); border-radius: var(--radius-md); font-size: 13px; resize: vertical; background: var(--bg-input); color: var(--text-primary); }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; }
.btn-cancel { padding: 8px 16px; border: 1px solid var(--border-light); border-radius: var(--radius-md); background: var(--bg-card); cursor: pointer; font-size: 13px; }
.btn-save { padding: 8px 16px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: 13px; }
.btn-save.danger { background: var(--danger, #ef4444); }
.btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
.retry-btn { padding: 6px 14px; border: 1px solid var(--border-light); border-radius: var(--radius-md); cursor: pointer; }
</style>
