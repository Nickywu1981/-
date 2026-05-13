<template>
  <AdminLayout>
    <div class="page-header">
      <h1>{{ $t('admin_recharge.page_title') }}</h1>
    </div>

    <div class="toolbar">
      <input v-model="keyword" type="text" maxlength="100" :placeholder="$t('admin_recharge.search_placeholder')" @keyup.enter="search" />
      <select v-model="filterStatus" class="sel" @change="search">
        <option value="">{{ $t('admin_recharge.all_statuses') }}</option>
        <option value="0">{{ $t('admin_recharge.status_pending') }}</option>
        <option value="1">{{ $t('admin_recharge.status_success') }}</option>
        <option value="2">{{ $t('admin_recharge.status_failed') }}</option>
        <option value="3">{{ $t('admin_recharge.status_refunded') }}</option>
      </select>
      <select v-model="filterChannel" class="sel" @change="search">
        <option value="">{{ $t('admin_recharge.all_channels') }}</option>
        <option value="wechat">{{ $t('admin_recharge.channel_wechat') }}</option>
        <option value="alipay">{{ $t('admin_recharge.channel_alipay') }}</option>
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
          <thead><tr><th>{{ $t('admin_recharge.col_order_no') }}</th><th>{{ $t('admin_recharge.col_amount') }}</th><th>{{ $t('admin_recharge.col_coin') }}</th><th>{{ $t('admin_recharge.col_channel') }}</th><th>{{ $t('admin_recharge.col_pay_status') }}</th><th>{{ $t('admin_recharge.col_pay_time') }}</th><th>{{ $t('common.action') }}</th></tr></thead>
          <tbody>
            <tr v-for="o in list" :key="o.id">
              <td>{{ o.order_no }}</td><td>¥{{ o.amount }}</td><td>{{ o.coin_amount }}</td>
              <td>{{ channelLabel(o.pay_channel) }}</td>
              <td><span :class="statusClass(o.pay_status)">{{ statusText(o.pay_status) }}</span></td>
              <td>{{ o.pay_time || '-' }}</td>
              <td class="actions">
                <button v-if="o.pay_status===1" class="btn-sm danger" @click="refund(o)">{{ $t('admin_recharge.refund') }}</button>
                <button class="btn-sm" @click="openDetail(o)">{{ $t('admin_recharge.detail') }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Pagination :page="page" :page-size="pageSize" :total="total" @change="onPageChange" />
    </template>
    <div v-else class="empty">{{ $t('admin_recharge.empty') }}</div>

    <Teleport to="body">
      <div v-if="detailOpen" class="modal-overlay" @click.self="detailOpen = false">
        <div class="modal">
          <h3>{{ $t('admin_recharge.detail_title') }}</h3>
          <div class="detail-grid">
            <div class="detail-item"><span class="dl">{{ $t('admin_recharge.label_order_no') }}</span><span class="dv mono">{{ detail.order_no }}</span></div>
            <div class="detail-item"><span class="dl">{{ $t('admin_recharge.label_amount') }}</span><span class="dv">¥{{ detail.amount }}</span></div>
            <div class="detail-item"><span class="dl">{{ $t('admin_recharge.label_coin') }}</span><span class="dv">{{ detail.coin_amount }}</span></div>
            <div class="detail-item"><span class="dl">{{ $t('admin_recharge.label_channel') }}</span><span class="dv">{{ channelLabel(detail.pay_channel) }}</span></div>
            <div class="detail-item"><span class="dl">{{ $t('admin_recharge.label_pay_status') }}</span><span class="dv"><span :class="statusClass(detail.pay_status)">{{ statusText(detail.pay_status) }}</span></span></div>
            <div class="detail-item"><span class="dl">{{ $t('admin_recharge.label_pay_time') }}</span><span class="dv">{{ detail.pay_time || '-' }}</span></div>
            <div class="detail-item"><span class="dl">{{ $t('admin_recharge.label_create_time') }}</span><span class="dv">{{ detail.create_time || '-' }}</span></div>
            <div class="detail-item"><span class="dl">{{ $t('admin_recharge.label_user_id') }}</span><span class="dv">{{ detail.user_id || '-' }}</span></div>
          </div>
          <div class="modal-actions">
            <button v-if="detail.pay_status===1" class="btn-danger" @click="refund(detail); detailOpen = false">{{ $t('admin_recharge.refund') }}</button>
            <button class="btn-cancel" @click="detailOpen = false">{{ $t('common.close') }}</button>
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
const filterChannel = ref('')
const loading = ref(true)
const error = ref('')
const detailOpen = ref(false)
const detail = ref<any>({})

const toast = useToast()
onMounted(fetchData)

function statusText(s: number) {
  const map: Record<number, string> = {
    0: t('admin_recharge.status_pending'),
    1: t('admin_recharge.status_success'),
    2: t('admin_recharge.status_failed'),
    3: t('admin_recharge.status_refunded'),
  }
  return map[s] || t('admin_recharge.unknown')
}
function statusClass(s: number) { return ['badge-pending', 'badge-ok', 'badge-fail', 'badge-refund'][s] || '' }

function channelLabel(ch: string) {
  if (ch === 'wechat') return t('admin_recharge.channel_wechat')
  if (ch === 'alipay') return t('admin_recharge.channel_alipay')
  return ch || '-'
}

async function fetchData() {
  loading.value = true; error.value = ''
  try {
    const params = new URLSearchParams({ page: String(page.value), pageSize: String(pageSize), keyword: keyword.value })
    if (filterStatus.value) params.set('payStatus', filterStatus.value)
    if (filterChannel.value) params.set('payChannel', filterChannel.value)
    const res: any = await $fetch(`/api/recharge/admin/orders?${params.toString()}`, { credentials: 'include' })
    if (res?.code === 200) { list.value = res.data?.list || []; total.value = res.data?.total || 0 }
    else { list.value = res.data || []; total.value = list.value.length }
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; error.value = err?.data?.msg || err.message || t('common.loadFail'); toast.error(error.value) } finally { loading.value = false }
}

function search() { page.value = 1; fetchData() }
function onPageChange(p: number) { page.value = p; fetchData() }
function openDetail(o: any) { detail.value = o; detailOpen.value = true }

async function refund(o: any) {
  if (!await confirm({ message: t('admin_recharge.confirm_refund', { order: o.order_no, amount: o.amount }) })) return
  try {
    const res: any = await $fetch(`/api/recharge/admin/refund/${o.order_no}`, { method: 'POST', credentials: 'include' })
    if (res?.code === 200 || res?.code === 0) { o.pay_status = 3; toast.success(t('admin_recharge.refund_success')) }
    else { toast.error(res?.msg || t('admin_recharge.refund_failed')) }
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || err.message || t('admin_recharge.refund_failed')) }
}
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
h1 { font-size: 20px; font-weight: 700; color: var(--text-primary); }

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

.badge-ok { color: var(--success); font-weight: 600; }
.badge-pending { color: var(--warning); font-weight: 600; }
.badge-fail { color: var(--danger); font-weight: 600; }
.badge-refund { color: var(--text-muted); font-weight: 600; }

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
.modal { background: var(--bg-card); border-radius: var(--modal-radius); padding: var(--modal-padding); width: 90%; max-width: 500px; max-height: 80vh; overflow-y: auto; box-shadow: var(--modal-shadow); animation: modal-enter var(--transition-slow); }
.modal h3 { font-size: 17px; font-weight: 600; margin-bottom: 20px; color: var(--text-primary); }
.detail-grid { display: flex; flex-direction: column; gap: 10px; }
.detail-item { display: flex; gap: 12px; align-items: center; }
.dl { font-size: 12px; color: var(--text-muted); min-width: 80px; }
.dv { font-size: 13px; color: var(--text-primary); }
.mono { font-family: monospace; font-size: 12px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
.btn-cancel { padding: 8px 20px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 13px; transition: border-color var(--transition-fast); }
.btn-cancel:hover { border-color: var(--text-muted); }
.btn-danger { padding: 8px 20px; background: var(--danger); color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; transition: opacity var(--transition-fast); }
.btn-danger:hover { opacity: 0.9; }
</style>
