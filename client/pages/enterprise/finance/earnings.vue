<template>
  <div class="finance-earnings">
    <h1 class="page-title">{{ $t('enterprise.finance.earnings.title') }}</h1>

    <!-- 收益概览 -->
    <div class="summary-grid" v-if="summary">
      <div class="summary-item"><span class="label">{{ $t('enterprise.finance.earnings.totalCommission') }}</span><strong>¥{{ fmtMoney(summary.totalEarnings) }}</strong></div>
      <div class="summary-item"><span class="label">{{ $t('enterprise.finance.earnings.settled') }}</span><strong class="green">¥{{ fmtMoney(summary.settled) }}</strong></div>
      <div class="summary-item"><span class="label">{{ $t('enterprise.finance.earnings.pendingSettle') }}</span><strong class="orange">¥{{ fmtMoney(summary.pending) }}</strong></div>
      <div class="summary-item"><span class="label">{{ $t('enterprise.finance.earnings.withdrawn') }}</span><strong class="blue">¥{{ fmtMoney(summary.withdrawn) }}</strong></div>
    </div>

    <!-- 筛选 -->
    <div class="toolbar">
      <select v-model="filterStatus" @change="loadData" class="filter-select">
        <option value="">{{ $t('enterprise.finance.earnings.allStatus') }}</option>
        <option value="settled">{{ $t('enterprise.finance.earnings.statusSettled') }}</option>
        <option value="pending">{{ $t('enterprise.finance.earnings.statusPending') }}</option>
        <option value="withdrawn">{{ $t('enterprise.finance.earnings.statusWithdrawn') }}</option>
      </select>
      <input type="date" v-model="startDate" class="date-input" @change="loadData" />
      <span class="sep">{{ $t('enterprise.finance.ledger.to') }}</span>
      <input type="date" v-model="endDate" class="date-input" @change="loadData" />
    </div>

    <div class="table-wrap">
      <table v-if="list.length">
        <thead><tr><th>{{ $t('enterprise.finance.earnings.consumerUser') }}</th><th>{{ $t('enterprise.finance.earnings.orderAmount') }}</th><th>{{ $t('enterprise.finance.earnings.commissionRate') }}</th><th>{{ $t('enterprise.finance.earnings.commission') }}</th><th>{{ $t('enterprise.finance.earnings.level') }}</th><th>{{ $t('enterprise.finance.earnings.status') }}</th><th>{{ $t('enterprise.finance.earnings.time') }}</th></tr></thead>
        <tbody>
          <tr v-for="item in list" :key="item.id">
            <td>{{ item.consumer_name || `${$t('enterprise.finance.earnings.consumerUser')}${item.consumer_id}` }}</td>
            <td>¥{{ fmtMoney(item.order_amount) }}</td>
            <td>{{ item.commission_rate }}%</td>
            <td class="green">¥{{ fmtMoney(item.commission) }}</td>
            <td>{{ item.level === 1 ? $t('enterprise.finance.earnings.level1') : $t('enterprise.finance.earnings.level2') }}</td>
            <td><span :class="['status-tag', item.status]">{{ statusLabel(item.status) }}</span></td>
            <td>{{ formatDateLocale(item.created_at) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">{{ $t('enterprise.finance.earnings.noData') }}</div>
    </div>

    <div class="pager" v-if="total > pageSize">
      <button :disabled="page <= 1" @click="page--; loadData()">{{ $t('enterprise.common.prevPage') }}</button>
      <span>{{ $t('enterprise.common.pageOf', { page, total: Math.ceil(total / pageSize) }) }}</span>
      <button :disabled="page >= Math.ceil(total / pageSize)" @click="page++; loadData()">{{ $t('enterprise.common.nextPage') }}</button>
    </div>
  </div>
</template>

<script setup>
import { useApi } from '~/composables/useApi';
import { formatDateLocale, fmtMoney } from '~/utils/format';
const { t } = useI18n();
const api = useApi();
const toast = useToast();

const list = ref([]);
const total = ref(0);
const summary = ref(null);
const page = ref(1);
const pageSize = 20;
const filterStatus = ref('');
const startDate = ref('');
const endDate = ref('');

onMounted(() => loadData());

async function loadData() {
  try {
    const params = { page: page.value, pageSize };
    if (filterStatus.value) params.status = filterStatus.value;
    if (startDate.value) params.startDate = startDate.value;
    if (endDate.value) params.endDate = endDate.value;
    const data = await api.get('/enterprise/finance/earnings', params);
    list.value = data?.list || [];
    total.value = data?.total || 0;
    summary.value = data?.summary || null;
  } catch (e) { toast.error(t('enterprise.finance.earnings.loadError')); }
}

function statusLabel(s) { const m = { settled: t('enterprise.finance.earnings.statusSettled'), pending: t('enterprise.finance.earnings.statusPending'), withdrawn: t('enterprise.finance.earnings.statusWithdrawn'), cancelled: t('enterprise.finance.earnings.statusCancelled') }; return m[s] || s; }

definePageMeta({ layout: 'enterprise' });
</script>

<style scoped>
.page-title { font-size: 24px; margin: 0 0 20px; color: #1a1a2e; }
.summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
.summary-item { background: #fff; padding: 18px; border-radius: 12px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.summary-item .label { display: block; font-size: 13px; color: #888; margin-bottom: 6px; }
.summary-item strong { font-size: 22px; }
.green { color: #27ae60; }
.orange { color: #f39c12; }
.blue { color: #1a73e8; }

.toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 20px; }
.filter-select, .date-input { padding: 8px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; background: #fff; }
.sep { color: #999; }

.table-wrap { background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 10px 14px; text-align: left; font-size: 14px; border-bottom: 1px solid #f0f0f0; }
th { background: #fafafa; color: #666; font-weight: 500; }
.status-tag { padding: 2px 10px; border-radius: 12px; font-size: 12px; }
.status-tag.settled { background: #e8f5e9; color: #27ae60; }
.status-tag.pending { background: #fff3e0; color: #f39c12; }
.status-tag.withdrawn { background: #e3f2fd; color: #1a73e8; }
.empty { padding: 60px; text-align: center; color: #999; }
.pager { display: flex; justify-content: center; align-items: center; gap: 12px; padding: 16px; }
.pager button { padding: 6px 14px; border: 1px solid #ddd; background: #fff; border-radius: 6px; cursor: pointer; }
.pager button:disabled { opacity: 0.4; }
</style>
