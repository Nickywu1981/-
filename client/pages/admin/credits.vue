<template>
  <AdminLayout>
    <h2 class="ptitle">积分消费管理</h2>

    <div class="filters">
      <input v-model="filterUserId" type="text" placeholder="用户ID" @keyup.enter="search" />
      <select v-model="filterType" @change="search">
        <option value="">全部{{ $t('common.type') }}</option>
        <option value="1">充值</option>
        <option value="2">消费</option>
      </select>
      <select v-model="filterStatus" @change="search">
        <option value="">全部{{ $t('common.status') }}</option>
        <option value="1">已{{ $t('common.confirm') }}</option>
        <option value="0">冻结中</option>
        <option value="2">已退款</option>
      </select>
      <button class="btn" @click="search">{{ $t('common.search') }}</button>
    </div>

    <LoadingSkeleton v-if="loading" type="table" :rows="5" :cols="10" />

    <div class="table-wrap" v-else-if="list.length">
      <table class="table">
        <thead>
          <tr>
            <th>ID</th><th>用户ID</th><th>{{ $t('common.type') }}</th><th>{{ $t('common.actions') }}</th><th>变动前</th><th>变动后</th>
            <th>消耗</th><th>{{ $t('common.status') }}</th><th>{{ $t('common.remark') }}</th><th>{{ $t('common.time') }}</th><th>{{ $t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in list" :key="r.id">
            <td>{{ r.id }}</td>
            <td>{{ r.user_id }}</td>
            <td><span class="badge" :class="r.type === 1 ? 'type-recharge' : 'type-spend'">{{ r.type === 1 ? '充值' : '消费' }}</span></td>
            <td>{{ r.action || '-' }}</td>
            <td>{{ r.credit_before }}</td>
            <td>{{ r.credit_after }}</td>
            <td :class="r.type === 1 ? 'earn' : 'spend'">{{ r.type === 1 ? '+' : '-' }}{{ r.consumed }}</td>
            <td><span class="badge" :class="statusClass(r.status)">{{ statusText(r.status) }}</span></td>
            <td class="remark">{{ r.remark || '-' }}</td>
            <td>{{ r.create_time?.slice(0, 16) }}</td>
            <td>
              <button v-if="r.status === 1" class="btn-sm btn-refund" @click="doRefund(r)">退款</button>
              <span v-else class="muted">-</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="!list.length && !loading" class="empty">暂无积分记录</div>

    <Pagination :page="page" :page-size="pageSize" :total="total" @change="onPageChange" />

    <!-- Refund Dialog -->
    <div v-if="refundDialog.open" class="modal-overlay" @click.self="refundDialog.open = false" @keydown.escape="refundDialog.open = false">
      <div class="modal-box">
        <h4>{{ $t('common.confirm') }}退款</h4>
        <p class="modal-info">记录 #{{ refundDialog.record?.id }}，消耗 {{ refundDialog.record?.consumed }} 点</p>
        <input v-model="refundDialog.remark" maxlength="500" type="text" placeholder="退款原因（选填）" @keyup.enter="confirmRefund" />
        <div class="modal-actions">
          <button class="btn-cancel" @click="refundDialog.open = false">{{ $t('common.cancel') }}</button>
          <button class="btn btn-refund" @click="confirmRefund">{{ $t('common.confirm') }}退款</button>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import type { ApiResponse } from '~/composables/useApi'
const { t } = useI18n()

const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const filterUserId = ref('')
const filterType = ref('')
const filterStatus = ref('')
const loading = ref(true)
const toast = useToast()

const refundDialog = reactive({ open: false, record: null as any, remark: '' })

function statusClass(s: number) { return s === 1 ? 'status-done' : s === 0 ? 'status-freeze' : 'status-refund' }
function statusText(s: number) { return s === 1 ? '已确认' : s === 0 ? '冻结中' : '已退款' }

async function fetch() {
  loading.value = true
  try {
    const params = new URLSearchParams({ page: String(page.value), pageSize: String(pageSize) })
    if (filterUserId.value) params.set('userId', filterUserId.value)
    if (filterType.value) params.set('type', filterType.value)
    if (filterStatus.value) params.set('status', filterStatus.value)
    const data = await $fetch(`/api/credits/admin/records?${params.toString()}`, { credentials: 'include' }) as ApiResponse<{list: any[], total: number}>
    if (data?.code === 200) {
      list.value = data.data.list || []
      total.value = data.data.total || 0
    }
  } catch (e: unknown) { toast.error(t('common.loadFail')) } finally { loading.value = false }
}

function search() { page.value = 1; fetch() }
function onPageChange(p: number) { page.value = p; fetch() }

function doRefund(record: any) {
  refundDialog.record = record
  refundDialog.remark = ''
  refundDialog.open = true
}

async function confirmRefund() {
  try {
    const data = await $fetch('/api/credits/admin/refund', { method: 'POST', credentials: 'include', body: { recordId: refundDialog.record.id, remark: refundDialog.remark || '管理员退款' } }) as ApiResponse
    if (data?.code === 200) { toast.success(t('common.success_refund')); refundDialog.open = false; fetch() }
    else { toast.error(data?.msg || '退款失败') }
  } catch (e: unknown) { toast.error(t('common.failed_refund')) }
}

onMounted(fetch)
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.ptitle { font-size: 20px; font-weight: 700; margin-bottom: 20px; color: var(--text-primary); }
.filters { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.filters input, .filters select { padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-md); font-size: 13px; background: var(--bg-card); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.filters input:focus, .filters select:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.filters input { width: 160px; }
.btn { padding: 8px 20px; background: var(--brand-gradient); color: #fff; border: none; border-radius: var(--radius-md); font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity var(--transition-fast), transform var(--transition-fast), box-shadow var(--transition-fast); }
.btn:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: var(--shadow-md); }
.table-wrap { overflow-x: auto; border-radius: var(--radius-lg); border: 1px solid var(--border-light); background: var(--bg-card); }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table th { background: var(--bg-secondary); color: var(--text-secondary); font-weight: 600; padding: 12px 10px; text-align: left; white-space: nowrap; border-bottom: 1px solid var(--border-light); }
.table td { padding: 10px; border-bottom: 1px solid var(--border-light); color: var(--text-primary); white-space: nowrap; }
.table tbody tr { transition: background var(--transition-fast); }
.table tbody tr:hover { background: var(--bg-hover); }
.remark { max-width: 180px; overflow: hidden; text-overflow: ellipsis; }
.empty { text-align: center; padding: 60px 20px; color: var(--text-muted); font-size: 14px; }
.badge { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.type-recharge { background: var(--success-bg); color: var(--success); }
.type-spend { background: var(--warning-bg); color: var(--warning); }
.status-done { background: var(--success-bg); color: var(--success); }
.status-freeze { background: var(--warning-bg); color: var(--warning); }
.status-refund { background: var(--danger-bg); color: var(--danger); }
.earn { color: var(--success); font-weight: 600; }
.spend { color: var(--danger); font-weight: 600; }
.muted { color: var(--text-muted); }
.btn-sm { padding: 4px 12px; border-radius: var(--radius-sm); font-size: 12px; cursor: pointer; border: none; transition: border-color var(--transition-fast), color var(--transition-fast); }
.btn-refund { background: var(--danger-light, #FEE2E2); color: var(--danger); }
.btn-refund:hover { background: var(--danger); color: #fff; }
/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 300; }
.modal-box { background: var(--bg-card); border-radius: var(--radius-lg); padding: 24px; width: 400px; max-width: 90vw; box-shadow: var(--shadow-xl); }
.modal-box h4 { font-size: 16px; font-weight: 700; margin-bottom: 8px; color: var(--text-primary); }
.modal-info { font-size: 13px; color: var(--text-secondary); margin-bottom: 12px; }
.modal-box input { width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-md); font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; margin-bottom: 16px; transition: border-color var(--transition-fast); }
.modal-box input:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.modal-actions { display: flex; gap: 8px; justify-content: flex-end; }
.btn-cancel { padding: 8px 16px; background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-light); border-radius: var(--radius-md); font-size: 13px; cursor: pointer; transition: background var(--transition-fast); }
.btn-cancel:hover { background: var(--bg-hover); }
</style>
