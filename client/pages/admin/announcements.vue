<template>
  <div class="page-card">
    <div class="page-header">
      <h1>{{ $t('admin_announcements.page_title') }}</h1>
      <button class="btn-primary" @click="openCreate">{{ $t('admin_announcements.new_announcement') }}</button>
    </div>

    <div class="filters">
      <select v-model="filterType" @change="fetch">
        <option value="">{{ $t('admin_announcements.all_types') }}</option>
        <option value="system">{{ $t('admin_announcements.type_system') }}</option>
        <option value="activity">{{ $t('admin_announcements.type_activity') }}</option>
        <option value="maintenance">{{ $t('admin_announcements.type_maintenance') }}</option>
        <option value="notice">{{ $t('admin_announcements.type_notice') }}</option>
      </select>
      <select v-model="filterStatus" @change="fetch">
        <option value="">{{ $t('admin_announcements.all_statuses') }}</option>
        <option :value="0">{{ $t('admin_announcements.status_draft') }}</option>
        <option :value="1">{{ $t('admin_announcements.status_published') }}</option>
        <option :value="2">{{ $t('admin_announcements.status_offline') }}</option>
      </select>
    </div>

    <div v-if="loading" class="loading">{{ $t('common.loading') }}</div>
    <div v-else-if="error" class="error-msg">{{ error }} <button class="btn-text" @click="fetch">{{ $t('common.retry') }}</button></div>
    <div v-else-if="!list.length" class="empty">{{ $t('admin_announcements.empty') }}</div>

    <table v-else class="data-table">
      <thead>
        <tr>
          <th>{{ $t('common.id') }}</th><th>{{ $t('admin_announcements.col_title') }}</th><th>{{ $t('admin_announcements.col_type') }}</th><th>{{ $t('admin_announcements.col_level') }}</th><th>{{ $t('admin_announcements.col_pinned') }}</th><th>{{ $t('admin_announcements.col_target') }}</th><th>{{ $t('admin_announcements.col_status') }}</th><th>{{ $t('admin_announcements.col_publish_time') }}</th><th>{{ $t('common.action') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in list" :key="row.id">
          <td>{{ row.id }}</td>
          <td>{{ row.title }}</td>
          <td><span class="status-tag">{{ typeLabel(row.type) }}</span></td>
          <td><span :class="['status-tag', levelClass(row.level)]">{{ levelLabel(row.level) }}</span></td>
          <td>{{ row.is_pinned ? $t('admin_announcements.pinned_icon') : '-' }}</td>
          <td>{{ row.target_audience || $t('admin_announcements.target_all') }}</td>
          <td><span :class="['status-tag', statusClass(row.status)]">{{ statusLabel(row.status) }}</span></td>
          <td>{{ row.publish_time || '-' }}</td>
          <td class="actions">
            <button class="btn-text" @click="openEdit(row)">{{ $t('common.edit') }}</button>
            <button class="btn-text danger" @click="del(row.id)">{{ $t('common.delete') }}</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="total > pageSize" class="pagination">
      <button :disabled="page <= 1" @click="page--; fetch()">{{ $t('common.prev_page') }}</button>
      <span>{{ $t('admin_campaigns.page_info', { page, totalPages, total }) }}</span>
      <button :disabled="page >= totalPages" @click="page++; fetch()">{{ $t('common.next_page') }}</button>
    </div>

    <div v-if="showModal" class="modal-mask" @click.self="showModal = false" @keydown.escape="showModal = false">
      <div class="modal" style="max-width:700px">
        <h2>{{ editing ? $t('admin_announcements.edit_modal') : $t('admin_announcements.create_modal') }}</h2>
        <label>{{ $t('admin_announcements.label_title') }} <input v-model="form.title" class="input" /></label>
        <label>{{ $t('admin_announcements.label_type') }}
          <select v-model="form.type" class="input">
            <option value="system">{{ $t('admin_announcements.type_system') }}</option>
            <option value="activity">{{ $t('admin_announcements.type_activity') }}</option>
            <option value="maintenance">{{ $t('admin_announcements.type_maintenance') }}</option>
            <option value="notice">{{ $t('admin_announcements.type_notice') }}</option>
          </select>
        </label>
        <label>{{ $t('admin_announcements.label_content') }} <textarea v-model="form.content" class="input" rows="6" /></label>
        <label>{{ $t('admin_announcements.label_level') }}
          <select v-model.number="form.level" class="input">
            <option :value="1">{{ $t('admin_announcements.level_normal') }}</option>
            <option :value="2">{{ $t('admin_announcements.level_important') }}</option>
            <option :value="3">{{ $t('admin_announcements.level_urgent') }}</option>
          </select>
        </label>
        <label class="checkbox-label"><input v-model.number="form.is_pinned" type="checkbox" :true-value="1" :false-value="0" /> {{ $t('admin_announcements.pinned_checkbox') }}</label>
        <label>{{ $t('admin_announcements.label_target') }}
          <select v-model="form.target_audience" class="input">
            <option value="all">{{ $t('admin_announcements.target_all_users') }}</option>
            <option value="new_user">{{ $t('admin_announcements.target_new_user') }}</option>
            <option value="vip">{{ $t('admin_announcements.target_vip') }}</option>
            <option value="enterprise">{{ $t('admin_announcements.target_enterprise') }}</option>
          </select>
        </label>
        <label>{{ $t('admin_announcements.label_publish_time') }} <input v-model="form.publish_time" class="input" type="datetime-local" /></label>
        <label>{{ $t('common.status') }}
          <select v-model.number="form.status" class="input">
            <option :value="0">{{ $t('admin_announcements.status_draft') }}</option>
            <option :value="1">{{ $t('admin_announcements.status_published') }}</option>
            <option :value="2">{{ $t('admin_announcements.status_offline') }}</option>
          </select>
        </label>
        <div class="modal-actions">
          <button class="btn-secondary" @click="showModal = false">{{ $t('common.cancel') }}</button>
          <button class="btn-primary" @click="save" :disabled="saving">{{ saving ? $t('common.saving') : $t('common.save') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const toast = useToast();
const { confirm } = useConfirm();
const list = ref<any[]>([])
const loading = ref(true)
const error = ref('')
const page = ref(1)
const pageSize = 20
const total = ref(0)
const totalPages = computed(() => Math.ceil(total.value / pageSize))
const filterType = ref('')
const filterStatus = ref('')
const showModal = ref(false)
const editing = ref<any>(null)
const saving = ref(false)
const form = reactive({ title: '', type: 'notice', content: '', level: 1, is_pinned: 0, target_audience: 'all', publish_time: '', status: 0 })

const TYPE_LABEL: Record<string, string> = {
  system: t('admin_announcements.type_label_system'),
  activity: t('admin_announcements.type_label_activity'),
  maintenance: t('admin_announcements.type_label_maintenance'),
  notice: t('admin_announcements.type_label_notice'),
}
const LEVEL_LABEL: Record<number, string> = {
  1: t('admin_announcements.level_label_normal'),
  2: t('admin_announcements.level_label_important'),
  3: t('admin_announcements.level_label_urgent'),
}
const STATUS_LABEL: Record<number, string> = {
  0: t('admin_announcements.status_draft'),
  1: t('admin_announcements.status_published'),
  2: t('admin_announcements.status_offline'),
}

function typeLabel(tp: string) { return TYPE_LABEL[tp] || tp }
function levelLabel(l: number) { return LEVEL_LABEL[l] || String(l) }
function levelClass(l: number) { return { 1: 'tag-draft', 2: 'tag-warn', 3: 'tag-error' }[l] || '' }
function statusLabel(s: number) { return STATUS_LABEL[s] || String(s) }
function statusClass(s: number) { return { 0: 'tag-draft', 1: 'tag-active', 2: 'tag-offline' }[s] || '' }

async function fetch() {
  loading.value = true; error.value = ''
  try {
    const params = new URLSearchParams({ page: String(page.value), pageSize: String(pageSize) })
    if (filterType.value) params.set('type', filterType.value)
    if (filterStatus.value) params.set('status', filterStatus.value)
    const res = await $fetch(`/api/admin/campaign/announcements?${params}`, { credentials: 'include' })
    list.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; error.value = err.message || t('common.loadFail') }
  finally { loading.value = false }
}

function openCreate() { editing.value = null; Object.assign(form, { title: '', type: 'notice', content: '', level: 1, is_pinned: 0, target_audience: 'all', publish_time: '', status: 0 }); showModal.value = true }
function openEdit(row: any) { editing.value = row; Object.assign(form, { ...row, is_pinned: row.is_pinned || 0 }); showModal.value = true }

async function save() {
  saving.value = true
  try {
    if (editing.value) {
      await $fetch(`/api/admin/campaign/announcements/${editing.value.id}`, { method: 'PUT', body: form, credentials: 'include' })
    } else {
      await $fetch('/api/admin/campaign/announcements', { method: 'POST', body: form, credentials: 'include' })
    }
    showModal.value = false
    fetch()
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err.message || t('common.failed_save')) }
  finally { saving.value = false }
}

async function del(id: number) {
  if (!(await confirm({ message: t('admin_announcements.delete_confirm'), title: t('admin_announcements.delete_irreversible') }))) return
  try {
    await $fetch(`/api/admin/campaign/announcements/${id}`, { method: 'DELETE', credentials: 'include' })
    fetch()
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err.message || t('common.failed_delete')) }
}

onMounted(fetch)
definePageMeta({ layout: 'platform-admin', middleware: ['auth'] })
</script>
