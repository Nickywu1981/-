<template>
  <div class="page-card">
    <div class="page-header">
      <h1>{{ $t('admin_campaigns.page_title') }}</h1>
      <button class="btn-primary" @click="openCreate">{{ $t('admin_campaigns.new_campaign') }}</button>
    </div>

    <div class="filters">
      <select v-model="filterType" @change="fetch">
        <option value="">{{ $t('admin_campaigns.all_types') }}</option>
        <option value="promotion">{{ $t('admin_campaigns.type_promotion') }}</option>
        <option value="coupon">{{ $t('admin_campaigns.type_coupon') }}</option>
        <option value="event">{{ $t('admin_campaigns.type_event') }}</option>
        <option value="announcement">{{ $t('admin_campaigns.type_announcement') }}</option>
      </select>
      <select v-model="filterStatus" @change="fetch">
        <option value="">{{ $t('admin_campaigns.all_statuses') }}</option>
        <option :value="0">{{ $t('admin_campaigns.status_draft') }}</option>
        <option :value="1">{{ $t('admin_campaigns.status_active') }}</option>
        <option :value="2">{{ $t('admin_campaigns.status_ended') }}</option>
        <option :value="3">{{ $t('admin_campaigns.status_offline') }}</option>
      </select>
    </div>

    <div v-if="loading" class="loading">{{ $t('common.loading') }}</div>
    <div v-else-if="error" class="error-msg">{{ error }} <button class="btn-text" @click="fetch">{{ $t('common.retry') }}</button></div>
    <div v-else-if="!list.length" class="empty">{{ $t('admin_campaigns.empty') }}</div>

    <table v-else class="data-table">
      <thead>
        <tr>
          <th>{{ $t('common.id') }}</th><th>{{ $t('admin_campaigns.col_title') }}</th><th>{{ $t('admin_campaigns.col_type') }}</th><th>{{ $t('common.status') }}</th><th>{{ $t('admin_campaigns.col_target') }}</th><th>{{ $t('admin_campaigns.col_start') }}</th><th>{{ $t('admin_campaigns.col_end') }}</th><th>{{ $t('common.action') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in list" :key="row.id">
          <td>{{ row.id }}</td>
          <td>{{ row.title }}</td>
          <td><span class="status-tag">{{ typeLabel(row.type) }}</span></td>
          <td><span :class="['status-tag', statusClass(row.status)]">{{ statusLabel(row.status) }}</span></td>
          <td>{{ row.target_audience || $t('admin_campaigns.target_all') }}</td>
          <td>{{ row.start_time || '-' }}</td>
          <td>{{ row.end_time || '-' }}</td>
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

    <!-- Modal -->
    <div v-if="showModal" class="modal-mask" @click.self="showModal = false">
      <div class="modal">
        <h2>{{ editing ? $t('admin_campaigns.edit_modal') : $t('admin_campaigns.create_modal') }}</h2>
        <label>{{ $t('admin_campaigns.label_title') }} <input v-model="form.title" class="input" /></label>
        <label>{{ $t('admin_campaigns.label_type') }}
          <select v-model="form.type" class="input">
            <option value="promotion">{{ $t('admin_campaigns.type_promotion') }}</option>
            <option value="coupon">{{ $t('admin_campaigns.type_coupon') }}</option>
            <option value="event">{{ $t('admin_campaigns.type_event') }}</option>
            <option value="announcement">{{ $t('admin_campaigns.type_announcement') }}</option>
          </select>
        </label>
        <label>{{ $t('admin_campaigns.label_desc') }} <textarea v-model="form.description" class="input" rows="3" /></label>
        <label>{{ $t('admin_campaigns.label_cover') }} <input v-model="form.cover_url" class="input" /></label>
        <label>{{ $t('admin_campaigns.label_reward_type') }} <input v-model="form.reward_type" class="input" :placeholder="$t('admin_campaigns.reward_placeholder')" /></label>
        <label>{{ $t('admin_campaigns.label_reward_value') }} <input v-model.number="form.reward_value" class="input" type="number" /></label>
        <label>{{ $t('admin_campaigns.label_start_time') }} <input v-model="form.start_time" class="input" type="datetime-local" /></label>
        <label>{{ $t('admin_campaigns.label_end_time') }} <input v-model="form.end_time" class="input" type="datetime-local" /></label>
        <label>{{ $t('admin_campaigns.label_target') }}
          <select v-model="form.target_audience" class="input">
            <option value="all">{{ $t('admin_campaigns.target_all_users') }}</option>
            <option value="new_user">{{ $t('admin_campaigns.target_new_user') }}</option>
            <option value="vip">{{ $t('admin_campaigns.target_vip') }}</option>
            <option value="enterprise">{{ $t('admin_campaigns.target_enterprise') }}</option>
          </select>
        </label>
        <label>{{ $t('common.status') }}
          <select v-model.number="form.status" class="input">
            <option :value="0">{{ $t('admin_campaigns.status_draft') }}</option>
            <option :value="1">{{ $t('admin_campaigns.status_active') }}</option>
            <option :value="2">{{ $t('admin_campaigns.status_ended') }}</option>
            <option :value="3">{{ $t('admin_campaigns.status_offline') }}</option>
          </select>
        </label>
        <label>{{ $t('admin_campaigns.label_sort') }} <input v-model.number="form.sort_order" class="input" type="number" /></label>
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
const form = reactive({ title: '', type: 'promotion', description: '', cover_url: '', reward_type: '', reward_value: 0, start_time: '', end_time: '', target_audience: 'all', status: 1, sort_order: 0 })

const TYPE_LABEL: Record<string, string> = {
  promotion: t('admin_campaigns.type_label_promotion'),
  coupon: t('admin_campaigns.type_label_coupon'),
  event: t('admin_campaigns.type_label_event'),
  announcement: t('admin_campaigns.type_label_announcement'),
}
const STATUS_LABEL: Record<number, string> = {
  0: t('admin_campaigns.status_draft'),
  1: t('admin_campaigns.status_active'),
  2: t('admin_campaigns.status_ended'),
  3: t('admin_campaigns.status_offline'),
}

function typeLabel(tp: string) { return TYPE_LABEL[tp] || tp }
function statusLabel(s: number) { return STATUS_LABEL[s] || String(s) }
function statusClass(s: number) { return { 0: 'tag-draft', 1: 'tag-active', 2: 'tag-ended', 3: 'tag-offline' }[s] || '' }

async function fetch() {
  loading.value = true; error.value = ''
  try {
    const params = new URLSearchParams({ page: String(page.value), pageSize: String(pageSize) })
    if (filterType.value) params.set('type', filterType.value)
    if (filterStatus.value) params.set('status', filterStatus.value)
    const res = await $fetch(`/api/admin/campaign/campaigns?${params}`)
    list.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; error.value = err.message || t('admin_campaigns.load_failed') }
  finally { loading.value = false }
}

function openCreate() { editing.value = null; Object.assign(form, { title: '', type: 'promotion', description: '', cover_url: '', reward_type: '', reward_value: 0, start_time: '', end_time: '', target_audience: 'all', status: 1, sort_order: 0 }); showModal.value = true }
function openEdit(row: any) { editing.value = row; Object.assign(form, row); showModal.value = true }

async function save() {
  saving.value = true
  try {
    if (editing.value) {
      await $fetch(`/api/admin/campaign/campaigns/${editing.value.id}`, { method: 'PUT', body: form })
    } else {
      await $fetch('/api/admin/campaign/campaigns', { method: 'POST', body: form })
    }
    showModal.value = false
    fetch()
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err.message || t('common.save_failed')) }
  finally { saving.value = false }
}

async function del(id: number) {
  if (!(await confirm({ message: t('admin_campaigns.delete_confirm'), title: t('admin_campaigns.delete_irreversible') }))) return
  try {
    await $fetch(`/api/admin/campaign/campaigns/${id}`, { method: 'DELETE' })
    fetch()
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err.message || t('common.delete_failed')) }
}

onMounted(fetch)
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>
