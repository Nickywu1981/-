<template>
  <div class="billing-page">
    <h2>账单记录</h2>

    <div class="summary">
      <span>共 {{ total }} 条记录</span>
    </div>

    <LoadingSkeleton v-if="loading" />
    <template v-else-if="list.length">
    <div class="table-wrap">
    <table class="table">
      <thead>
        <tr>
          <th>记录</th>
          <th>变动前</th>
          <th>变动后</th>
          <th>变更</th>
          <th>备注</th>
          <th>时间</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in list" :key="item.id">
          <td>{{ item.action?.replace(/_/g, ' ') }}</td>
          <td>{{ item.credit_before }}</td>
          <td>{{ item.credit_after }}</td>
          <td :class="item.consumed > 0 ? 'cost' : 'earn'">
            {{ item.consumed > 0 ? `-${item.consumed}` : `+${Math.abs(item.consumed)}` }}
          </td>
          <td>{{ item.remark }}</td>
          <td>{{ item.create_time?.slice(0, 16) }}</td>
        </tr>
      </tbody>
    </table>
    </div>

    <Pagination v-if="total > pageSize" :page="page" :total="total" :page-size="pageSize" @change="onPageChange" />
    </template>
    <div v-else class="empty">暂无账单记录</div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const loading = ref(true);

onMounted(() => { fetchData(); });

async function fetchData() {
  loading.value = true;
  try {
    const data: any = await $fetch(`/api/payment/billing?page=${page.value}&pageSize=${pageSize}`, { credentials: 'include' });
    if (data.code === 200) {
      list.value = data.data.list || [];
      total.value = data.data.total || 0;
    }
  } catch { /* ignore */ }
  loading.value = false;
}

function onPageChange(p: number) { page.value = p; fetchData(); }
</script>

<style scoped>
.billing-page { max-width: 800px; margin: 0 auto; padding: 40px 16px; }
h2 { font-size: 24px; font-weight: 700; color: var(--text-primary); margin-bottom: 20px; }
.summary { margin-bottom: 16px; font-size: 14px; color: var(--text-secondary); }

.table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; white-space: nowrap; }
.table th, .table td { text-align: left; padding: 10px 8px; border-bottom: 1px solid var(--border-light); }
.table th { color: var(--text-tertiary); font-weight: 500; font-size: 12px; }
.cost { color: var(--danger); font-weight: 600; }
.earn { color: var(--success); font-weight: 600; }

.empty { text-align: center; color: var(--text-tertiary); padding: 60px 0; }
</style>
