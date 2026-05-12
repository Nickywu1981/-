<template>
  <div class="billing-page">
    <h2>{{ $t('account_pages.billing.title') }}</h2>

    <div class="summary">
      <span>{{ $t('account_pages.billing.summary', { total }) }}</span>
    </div>

    <LoadingSkeleton v-if="loading" />
    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button class="btn-outline" @click="fetchData">{{ $t('error.retry') }}</button>
    </div>
    <template v-else-if="list.length">
    <div class="table-wrap">
    <table class="table">
      <thead>
        <tr>
          <th>{{ $t('account_pages.billing.col_record') }}</th>
          <th>{{ $t('account_pages.billing.col_before') }}</th>
          <th>{{ $t('account_pages.billing.col_after') }}</th>
          <th>{{ $t('account_pages.billing.col_change') }}</th>
          <th>{{ $t('account_pages.billing.col_remark') }}</th>
          <th>{{ $t('account_pages.billing.col_time') }}</th>
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
    <div v-else class="empty">{{ $t('account_pages.billing.empty') }}</div>
  </div>
</template>

<script setup lang="ts">

const { t } = useI18n()
const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const loading = ref(true);
const error = ref('');
const toast = useToast()

onMounted(() => { fetchData(); });

async function fetchData() {
  loading.value = true; error.value = '';
  try {
    const data: any = await $fetch(`/api/payment/billing?page=${page.value}&pageSize=${pageSize}`, { credentials: 'include' });
    if (data.code === 200) {
      list.value = data.data.list || [];
      total.value = data.data.total || 0;
    }
  } catch { error.value = t('account_pages.billing.load_error') }
  loading.value = false;
}

function onPageChange(p: number) { page.value = p; fetchData(); }
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
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
.error-state { text-align: center; padding: 60px 20px; }
.error-state p { color: var(--danger); margin-bottom: 16px; }
.btn-outline { padding: 8px 20px; border: 1px solid var(--border-light); border-radius: var(--radius-md); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 13px; }
.btn-outline:hover { border-color: var(--brand); }
</style>
