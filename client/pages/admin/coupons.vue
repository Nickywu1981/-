<template>
  <div class="page-card">
    <div class="page-header">
      <h1>{{ $t('admin_coupons.page_title') }}</h1>
      <button class="btn-primary" @click="openCreate">{{ $t('admin_coupons.create_coupon') }}</button>
    </div>

    <div v-if="loading" class="loading">{{ $t('common.loading') }}</div>
    <div v-else-if="error" class="error-msg">{{ error }} <button class="btn-text" @click="fetch">{{ $t('common.retry') }}</button></div>
    <div v-else-if="!list.length" class="empty">{{ $t('admin_coupons.empty') }}</div>

    <table v-else class="data-table">
      <thead>
        <tr>
          <th>ID</th><th>{{ $t('admin_coupons.col_code') }}</th><th>{{ $t('admin_coupons.col_name') }}</th><th>{{ $t('admin_coupons.col_type') }}</th><th>{{ $t('admin_coupons.col_value') }}</th><th>{{ $t('admin_coupons.col_min_amount') }}</th><th>{{ $t('admin_coupons.col_usage') }}</th><th>{{ $t('admin_coupons.col_status') }}</th><th>{{ $t('admin_coupons.col_validity') }}</th><th>{{ $t('admin_coupons.col_action') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in list" :key="row.id">
          <td>{{ row.id }}</td>
          <td><code>{{ row.code }}</code></td>
          <td>{{ row.name }}</td>
          <td><span class="status-tag">{{ row.type === 'fixed' ? $t('admin_coupons.type_fixed') : $t('admin_coupons.type_percent') }}</span></td>
          <td>{{ row.type === 'fixed' ? '¥' + row.value : row.value + '%' }}</td>
          <td>{{ row.min_order_amount ? '¥' + row.min_order_amount : '-' }}</td>
          <td>{{ row.used_quantity }} / {{ row.total_quantity || '∞' }}</td>
          <td><span :class="['status-tag', row.status ? 'tag-active' : 'tag-offline']">{{ row.status ? $t('admin_coupons.status_enabled') : $t('admin_coupons.status_disabled') }}</span></td>
          <td>{{ row.start_time || '-' }} ~ {{ row.end_time || '-' }}</td>
          <td class="actions">
            <button class="btn-text" @click="openEdit(row)">{{ $t('common.edit') }}</button>
            <button class="btn-text danger" @click="del(row.id)">{{ $t('common.delete') }}</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="total > pageSize" class="pagination">
      <button :disabled="page <= 1" @click="page--; fetch()">{{ $t('admin_coupons.prev_page') }}</button>
      <span>{{ $t('admin_coupons.page_info', { page, totalPages, total }) }}</span>
      <button :disabled="page >= totalPages" @click="page++; fetch()">{{ $t('admin_coupons.next_page') }}</button>
    </div>

    <div v-if="showModal" class="modal-mask" @click.self="showModal = false" @keydown.escape="showModal = false">
      <div class="modal">
        <h2>{{ editing ? $t('admin_coupons.edit_modal') : $t('admin_coupons.create_modal') }}</h2>
        <label>{{ $t('admin_coupons.label_code') }} <input v-model="form.code" class="input" /></label>
        <label>{{ $t('admin_coupons.label_name') }} <input v-model="form.name" class="input" /></label>
        <label>{{ $t('admin_coupons.label_type') }}
          <select v-model="form.type" class="input">
            <option value="fixed">{{ $t('admin_coupons.type_option_fixed') }}</option>
            <option value="percent">{{ $t('admin_coupons.type_option_percent') }}</option>
          </select>
        </label>
        <label>{{ $t('admin_coupons.label_value') }} <input v-model.number="form.value" class="input" type="number" step="0.01" /></label>
        <label>{{ $t('admin_coupons.label_min_amount') }} <input v-model.number="form.min_order_amount" class="input" type="number" step="0.01" /></label>
        <label v-if="form.type === 'percent'">{{ $t('admin_coupons.label_max_discount') }} <input v-model.number="form.max_discount" class="input" type="number" step="0.01" /></label>
        <label>{{ $t('admin_coupons.label_total_qty') }} <input v-model.number="form.total_quantity" class="input" type="number" /></label>
        <label>{{ $t('admin_coupons.label_per_user_limit') }} <input v-model.number="form.per_user_limit" class="input" type="number" /></label>
        <label>{{ $t('admin_coupons.label_start_time') }} <input v-model="form.start_time" class="input" type="datetime-local" /></label>
        <label>{{ $t('admin_coupons.label_end_time') }} <input v-model="form.end_time" class="input" type="datetime-local" /></label>
        <label>{{ $t('admin_coupons.label_status') }}
          <select v-model.number="form.status" class="input">
            <option :value="1">{{ $t('admin_coupons.status_enabled') }}</option>
            <option :value="0">{{ $t('admin_coupons.status_disabled') }}</option>
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
const showModal = ref(false)
const editing = ref<any>(null)
const saving = ref(false)
const form = reactive({ code: '', name: '', type: 'fixed', value: 0, min_order_amount: 0, max_discount: null as number|null, total_quantity: 0, per_user_limit: 1, start_time: '', end_time: '', status: 1 })

async function fetch() {
  loading.value = true; error.value = ''
  try {
    const res = await $fetch(`/api/admin/campaign/coupons?page=${page.value}&pageSize=${pageSize}`, { credentials: 'include' })
    list.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; error.value = err.message || t('admin_coupons.load_failed') }
  finally { loading.value = false }
}

function openCreate() { editing.value = null; Object.assign(form, { code: '', name: '', type: 'fixed', value: 0, min_order_amount: 0, max_discount: null, total_quantity: 0, per_user_limit: 1, start_time: '', end_time: '', status: 1 }); showModal.value = true }
function openEdit(row: any) { editing.value = row; Object.assign(form, row); showModal.value = true }

async function save() {
  saving.value = true
  try {
    if (editing.value) {
      await $fetch(`/api/admin/campaign/coupons/${editing.value.id}`, { method: 'PUT', body: form, credentials: 'include' })
    } else {
      await $fetch('/api/admin/campaign/coupons', { method: 'POST', body: form, credentials: 'include' })
    }
    showModal.value = false
    fetch()
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err.message || t('admin_coupons.save_failed')) }
  finally { saving.value = false }
}

async function del(id: number) {
  if (!(await confirm({ message: t('admin_coupons.delete_confirm_msg'), title: t('admin_coupons.delete_confirm_title') }))) return
  try {
    await $fetch(`/api/admin/campaign/coupons/${id}`, { method: 'DELETE', credentials: 'include' })
    fetch()
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err.message || t('admin_coupons.delete_failed')) }
}

onMounted(fetch)
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>
