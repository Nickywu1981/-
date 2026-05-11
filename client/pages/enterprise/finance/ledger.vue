<template>
  <div class="finance-ledger">
    <h1 class="page-title">账户流水</h1>

    <div class="toolbar">
      <select v-model="filterType" @change="loadData" class="filter-select">
        <option value="">全部类型</option>
        <option value="revenue">收入</option>
        <option value="commission">佣金</option>
        <option value="withdrawal">提现</option>
        <option value="refund">退款</option>
        <option value="adjustment">调账</option>
      </select>
      <input type="date" v-model="startDate" class="date-input" @change="loadData" />
      <span class="sep">至</span>
      <input type="date" v-model="endDate" class="date-input" @change="loadData" />
    </div>

    <div class="table-wrap">
      <table v-if="list.length">
        <thead><tr><th>类型</th><th>金额</th><th>变动前</th><th>变动后</th><th>备注</th><th>时间</th></tr></thead>
        <tbody>
          <tr v-for="item in list" :key="item.id">
            <td><span :class="['type-tag', item.ledger_type]">{{ typeLabel(item.ledger_type) }}</span></td>
            <td :class="item.amount >= 0 ? 'green' : 'red'">{{ item.amount >= 0 ? '+' : '' }}{{ fmt(item.amount) }}</td>
            <td>{{ fmt(item.balance_before) }}</td>
            <td>{{ fmt(item.balance_after) }}</td>
            <td class="remark">{{ item.remark || '-' }}</td>
            <td>{{ formatDate(item.create_time) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">暂无流水记录</div>
    </div>

    <div class="pager" v-if="total > pageSize">
      <button :disabled="page <= 1" @click="page--; loadData()">上一页</button>
      <span>第 {{ page }} / {{ Math.ceil(total / pageSize) }} 页</span>
      <button :disabled="page >= Math.ceil(total / pageSize)" @click="page++; loadData()">下一页</button>
    </div>
  </div>
</template>

<script setup>
import { useApi } from '~/composables/useApi';
import { useToast } from '~/composables/useToast';
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
  } catch (e) { toast.error('流水明细加载失败'); }
}

function typeLabel(t) { const m = { revenue: '收入', commission: '佣金', withdrawal: '提现', refund: '退款', adjustment: '调账' }; return m[t] || t; }
function fmt(n) { return (Number(n) || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 }); }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : '-'; }

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
