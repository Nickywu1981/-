<template>
  <div class="finance-settlement">
    <h1 class="page-title">结算记录</h1>

    <div class="table-wrap">
      <table v-if="list.length">
        <thead><tr><th>批次号</th><th>结算周期</th><th>订单金额</th><th>佣金比例</th><th>佣金金额</th><th>状态</th><th>时间</th></tr></thead>
        <tbody>
          <tr v-for="item in list" :key="item.id">
            <td>{{ item.batch_no || '-' }}</td>
            <td>{{ item.cycle_start }} ~ {{ item.cycle_end }}</td>
            <td>¥{{ fmt(item.order_amount) }}</td>
            <td>{{ item.commission_rate ? item.commission_rate + '%' : '-' }}</td>
            <td>¥{{ fmt(item.commission_amount) }}</td>
            <td><span :class="['status-tag', item.status]">{{ item.status === 'settled' ? '已结算' : '待结算' }}</span></td>
            <td>{{ formatDate(item.create_time) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">暂无结算记录</div>
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

onMounted(() => loadData());

async function loadData() {
  try {
    const data = await api.get('/enterprise/finance/settlement', { page: page.value, pageSize });
    list.value = data?.list || [];
    total.value = data?.total || 0;
  } catch (e) { console.error(e); toast.error('结算记录加载失败'); }
}

function fmt(n) { return (Number(n) || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 }); }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : '-'; }

definePageMeta({ layout: 'enterprise' });
</script>

<style scoped>
.page-title { font-size: 24px; margin: 0 0 20px; color: #1a1a2e; }
.table-wrap { background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: hidden; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 10px 14px; text-align: left; font-size: 14px; border-bottom: 1px solid #f0f0f0; }
th { background: #fafafa; color: #666; font-weight: 500; }
.status-tag { padding: 2px 10px; border-radius: 12px; font-size: 12px; }
.status-tag.settled { background: #e8f5e9; color: #27ae60; }
.status-tag.pending { background: #fff3e0; color: #f39c12; }
.empty { padding: 60px; text-align: center; color: #999; }
.pager { display: flex; justify-content: center; align-items: center; gap: 12px; padding: 16px; }
.pager button { padding: 6px 14px; border: 1px solid #ddd; background: #fff; border-radius: 6px; cursor: pointer; }
.pager button:disabled { opacity: 0.4; }
</style>
