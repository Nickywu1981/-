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
import { useApi } from '~/composables/useApi';
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

function typeLabel(ty) { const m: Record<string, string> = { revenue: t('enterprise.finance.ledger.typeRevenue'), commission: t('enterprise.finance.ledger.typeCommission'), withdrawal: t('enterprise.finance.ledger.typeWithdrawal'), refund: t('enterprise.finance.ledger.typeRefund'), adjustment: t('enterprise.finance.ledger.typeAdjustment') }; return m[ty] || ty; }

definePageMeta({ layout: 'enterprise' });
</script>

<style scoped>
.page-title { font-size: 24px; margin: 0 0 20px; color: #1a1a2e; }
.toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 20px; }
.filter-select, .date-input { padding: 8px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; background: #fff; }
.sep { color: #999; font-size: 14px; }

.table-wrap { background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 10px 14px; text-align: left; font-size: 14px; border-bottom: 1px solid #f0f0f0; }
th { background: #fafafa; color: #666; font-weight: 500; }
.type-tag { padding: 2px 10px; border-radius: 12px; font-size: 12px; }
.type-tag.revenue { background: #e8f5e9; color: #27ae60; }
.type-tag.commission { background: #fff3e0; color: #f39c12; }
.type-tag.withdrawal { background: #e3f2fd; color: #1a73e8; }
.type-tag.refund { background: #fbe9e7; color: #e74c3c; }
.type-tag.adjustment { background: #f3e5f5; color: #9b59b6; }
.green { color: #27ae60; font-weight: 600; }
.red { color: #e74c3c; font-weight: 600; }
.remark { max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.empty { padding: 60px; text-align: center; color: #999; }
.pager { display: flex; justify-content: center; align-items: center; gap: 12px; padding: 16px; }
.pager button { padding: 6px 14px; border: 1px solid #ddd; background: #fff; border-radius: 6px; cursor: pointer; }
.pager button:disabled { opacity: 0.4; }
</style>
