<template>
  <div class="finance-ledger">
    <h1 class="page-title">{{ $t('enterprise.finance.ledger.title') }}</h1>

    <div class="toolbar">
      <select v-model="filterType" @change="loadData" class="filter-select">
        <option value="">{{ $t('enterprise.finance.ledger.allTypes') }}</option>
        <option value="revenue">{{ $t('enterprise.finance.ledger.typeRevenue') }}</option>
        <option value="commission">{{ $t('enterprise.finance.ledger.typeCommission') }}</option>
        <option value="withdrawal">{{ $t('enterprise.finance.ledger.typeWithdrawal') }}</option>
        <option value="refund">{{ $t('enterprise.finance.ledger.typeRefund') }}</option>
        <option value="adjustment">{{ $t('enterprise.finance.ledger.typeAdjustment') }}</option>
      </select>
      <input type="date" v-model="startDate" class="date-input" @change="loadData" />
      <span class="sep">{{ $t('enterprise.finance.ledger.to') }}</span>
      <input type="date" v-model="endDate" class="date-input" @change="loadData" />
    </div>

    <div class="table-wrap">
      <table v-if="list.length">
        <thead><tr><th>{{ $t('enterprise.finance.ledger.type') }}</th><th>{{ $t('enterprise.finance.ledger.amount') }}</th><th>{{ $t('enterprise.finance.ledger.before') }}</th><th>{{ $t('enterprise.finance.ledger.after') }}</th><th>{{ $t('enterprise.finance.ledger.remark') }}</th><th>{{ $t('enterprise.finance.ledger.time') }}</th></tr></thead>
        <tbody>
          <tr v-for="item in list" :key="item.id">
            <td><span :class="['type-tag', item.ledger_type]">{{ typeLabel(item.ledger_type) }}</span></td>
            <td :class="item.amount >= 0 ? 'green' : 'red'">{{ item.amount >= 0 ? '+' : '' }}{{ fmtMoney(item.amount) }}</td>
            <td>{{ fmtMoney(item.balance_before) }}</td>
            <td>{{ fmtMoney(item.balance_after) }}</td>
            <td class="remark">{{ item.remark || '-' }}</td>
            <td>{{ formatDateLocale(item.create_time) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">{{ $t('enterprise.finance.ledger.noData') }}</div>
    </div>

    <div class="pager" v-if="total > pageSize">
      <button :disabled="page <= 1" @click="page--; loadData()">{{ $t('enterprise.common.prevPage') }}</button>
      <span>{{ $t('enterprise.common.pageOf', { page, total: Math.ceil(total / pageSize) }) }}</span>
      <button :disabled="page >= Math.ceil(total / pageSize)" @click="page++; loadData()">{{ $t('enterprise.common.nextPage') }}</button>
    </div>
  </div>
</template>

<script setup>

import { formatDateLocale, fmtMoney } from '~/utils/format';
const { t } = useI18n();
const api = useApi();
const toast = useToast();

const list = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const filterType = ref('');
const startDate = ref('');
const endDate = ref('');

onMounted(() => loadData());

async function loadData() {
  try {
    const params = { page: page.value, pageSize };
    if (filterType.value) params.type = filterType.value;
    if (startDate.value) params.startDate = startDate.value;
    if (endDate.value) params.endDate = endDate.value;
    const data = await api.get('/enterprise/finance/ledger', params);
    list.value = data?.list || [];
    total.value = data?.total || 0;
  } catch (e) { toast.error(t('enterprise.finance.ledger.loadError')); }
}

function typeLabel(ty) { const m = { revenue: t('enterprise.finance.ledger.typeRevenue'), commission: t('enterprise.finance.ledger.typeCommission'), withdrawal: t('enterprise.finance.ledger.typeWithdrawal'), refund: t('enterprise.finance.ledger.typeRefund'), adjustment: t('enterprise.finance.ledger.typeAdjustment') }; return m[ty] || ty; }

definePageMeta({ layout: 'user-workspace' });
</script>

<style scoped>
.page-title { font-size: 24px; margin: 0 0 20px; color: var(--text-primary); }
.toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 20px; }
.filter-select, .date-input { padding: 8px 12px; border: 1px solid var(--border-light); border-radius: 8px; font-size: 14px; background: var(--bg-card); }
.sep { color: var(--text-muted); font-size: 14px; }

.table-wrap { background: var(--bg-card); border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 10px 14px; text-align: left; font-size: 14px; border-bottom: 1px solid var(--border-light); }
th { background: var(--table-header-bg); color: var(--text-secondary); font-weight: 500; }
.type-tag { padding: 2px 10px; border-radius: 12px; font-size: 12px; }
.type-tag.revenue { background: var(--success-bg); color: var(--success); }
.type-tag.commission { background: var(--warning-bg); color: var(--warning); }
.type-tag.withdrawal { background: var(--info-bg); color: var(--info); }
.type-tag.refund { background: var(--danger-bg); color: var(--danger); }
.type-tag.adjustment { background: var(--brand-bg); color: var(--brand); }
.green { color: var(--success); font-weight: 600; }
.red { color: var(--danger); font-weight: 600; }
.remark { max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.empty { padding: 60px; text-align: center; color: var(--text-muted); }
.pager { display: flex; justify-content: center; align-items: center; gap: 12px; padding: 16px; }
.pager button { padding: 6px 14px; border: 1px solid var(--border-light); background: var(--bg-card); border-radius: 6px; cursor: pointer; }
.pager button:disabled { opacity: 0.4; }
</style>
