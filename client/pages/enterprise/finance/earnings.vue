<template>
  <div class="finance-earnings">
    <h1 class="page-title">佣金收益</h1>

    <!-- 收益概览 -->
    <div class="summary-grid" v-if="summary">
      <div class="summary-item"><span class="label">累计佣金</span><strong>¥{{ fmt(summary.totalEarnings) }}</strong></div>
      <div class="summary-item"><span class="label">已结算</span><strong class="green">¥{{ fmt(summary.settled) }}</strong></div>
      <div class="summary-item"><span class="label">待结算</span><strong class="orange">¥{{ fmt(summary.pending) }}</strong></div>
      <div class="summary-item"><span class="label">已提现</span><strong class="blue">¥{{ fmt(summary.withdrawn) }}</strong></div>
    </div>

    <!-- 筛选 -->
    <div class="toolbar">
      <select v-model="filterStatus" @change="loadData" class="filter-select">
        <option value="">全部状态</option>
        <option value="settled">已结算</option>
        <option value="pending">待结算</option>
        <option value="withdrawn">已提现</option>
      </select>
      <input type="date" v-model="startDate" class="date-input" @change="loadData" />
      <span class="sep">至</span>
      <input type="date" v-model="endDate" class="date-input" @change="loadData" />
    </div>

    <div class="table-wrap">
      <table v-if="list.length">
        <thead><tr><th>消费用户</th><th>订单金额</th><th>佣金比例</th><th>佣金</th><th>层级</th><th>状态</th><th>时间</th></tr></thead>
        <tbody>
          <tr v-for="item in list" :key="item.id">
            <td>{{ item.consumer_name || `用户${item.consumer_id}` }}</td>
            <td>¥{{ fmt(item.order_amount) }}</td>
            <td>{{ item.commission_rate }}%</td>
            <td class="green">¥{{ fmt(item.commission) }}</td>
            <td>{{ item.level === 1 ? '一级' : '二级' }}</td>
            <td><span :class="['status-tag', item.status]">{{ statusLabel(item.status) }}</span></td>
            <td>{{ formatDate(item.created_at) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">暂无佣金记录</div>
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
const api = useApi();

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
  } catch (e) { console.error(e); }
}

function statusLabel(s) { const m = { settled: '已结算', pending: '待结算', withdrawn: '已提现', cancelled: '已取消' }; return m[s] || s; }
function fmt(n) { return (Number(n) || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 }); }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : '-'; }

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

.table-wrap { background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: hidden; }
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
