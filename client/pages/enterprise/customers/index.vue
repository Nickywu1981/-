<template>
  <div class="ent-customers">
    <div class="page-header">
      <h1 class="page-title">{{ $t('enterprise.customers.index.title') }}</h1>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card"><span class="stat-num">{{ stats.total }}</span><span class="stat-label">{{ $t('enterprise.customers.index.totalCustomers') }}</span></div>
      <div class="stat-card"><span class="stat-num">{{ stats.activeToday }}</span><span class="stat-label">{{ $t('enterprise.customers.index.todayActive') }}</span></div>
      <div class="stat-card"><span class="stat-num">{{ stats.newThisMonth }}</span><span class="stat-label">{{ $t('enterprise.customers.index.monthlyNew') }}</span></div>
      <div class="stat-card"><span class="stat-num">{{ stats.withMembership }}</span><span class="stat-label">{{ $t('enterprise.customers.index.paidMembers') }}</span></div>
    </div>

    <!-- 搜索/筛选 -->
    <div class="toolbar">
      <input v-model="keyword" :placeholder="$t('enterprise.customers.index.searchPlaceholder')" class="search-input" @keyup.enter="loadCustomers" />
      <select v-model="statusFilter" @change="loadCustomers" class="filter-select">
        <option value="">{{ $t('enterprise.users.allStatus') }}</option>
        <option value="1">{{ $t('enterprise.common.statusEnabled') }}</option>
        <option value="0">{{ $t('enterprise.common.statusDisabled') }}</option>
      </select>
      <select v-model="tagFilter" @change="loadCustomers" class="filter-select">
        <option value="">{{ $t('enterprise.customers.index.allTags') }}</option>
        <option v-for="t in tags" :key="t.id" :value="t.id">{{ t.name }}</option>
      </select>
      <button class="btn-text" @click="loadCustomers">{{ $t('enterprise.common.search') }}</button>
    </div>

    <!-- 客户列表 -->
    <div class="table-wrap" v-if="!loading">
      <table v-if="customers.length">
        <thead>
          <tr><th>{{ $t('enterprise.customers.index.username') }}</th><th>{{ $t('enterprise.customers.index.nickname') }}</th><th>{{ $t('enterprise.customers.index.phone') }}</th><th>{{ $t('enterprise.customers.index.member') }}</th><th>{{ $t('enterprise.customers.index.tags') }}</th><th>{{ $t('enterprise.customers.index.status') }}</th><th>{{ $t('enterprise.customers.index.registeredAt') }}</th><th>{{ $t('enterprise.customers.index.actions') }}</th></tr>
        </thead>
        <tbody>
          <tr v-for="c in customers" :key="c.id">
            <td>{{ c.username }}</td>
            <td>{{ c.nickname || '-' }}</td>
            <td>{{ c.phone || '-' }}</td>
            <td>{{ planLabel(c.plan_type) }}</td>
            <td>
              <span v-for="t in getCustomerTags(c.id)" :key="t?.id" class="tag-chip" :style="{ background: t?.color || '#3B82F6' }">{{ t?.name }}</span>
              <span v-if="!getCustomerTags(c.id).length" class="text-muted">-</span>
            </td>
            <td><span :class="['status-tag', c.status === 1 ? 'on' : 'off']">{{ c.status === 1 ? $t('enterprise.common.statusEnabled') : $t('enterprise.common.statusDisabled') }}</span></td>
            <td>{{ formatDateLocale(c.create_time) }}</td>
            <td class="actions">
              <button class="btn-sm" @click="goDetail(c.id)">{{ $t('enterprise.customers.index.detail') }}</button>
              <button class="btn-sm" @click="openTagPicker(c)">{{ $t('enterprise.customers.index.tagAction') }}</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">{{ $t('enterprise.customers.index.noData') }}</div>

      <div class="pager" v-if="total > pageSize">
        <button :disabled="page <= 1" @click="page--; loadCustomers()">{{ $t('enterprise.common.prevPage') }}</button>
        <span>{{ $t('enterprise.common.pageOf', { page, total: Math.ceil(total / pageSize) }) }}</span>
        <button :disabled="page >= Math.ceil(total / pageSize)" @click="page++; loadCustomers()">{{ $t('enterprise.common.nextPage') }}</button>
      </div>
    </div>

    <!-- 打标弹窗 -->
    <div class="modal-overlay" v-if="showTagPicker" @click.self="showTagPicker = false">
      <div class="modal">
        <h3>{{ $t('enterprise.customers.index.tagModalTitle') }} — {{ tagTarget?.nickname || tagTarget?.username }}</h3>
        <div class="tag-list">
          <label v-for="t in tags" :key="t.id" class="tag-check">
            <input type="checkbox" :value="t.id" v-model="selectedTags" />
            <span class="tag-chip" :style="{ background: t.color }">{{ t.name }}</span>
          </label>
        </div>
        <div class="modal-actions">
          <button class="btn-text" @click="showTagPicker = false">{{ $t('enterprise.common.cancel') }}</button>
          <button class="btn-primary" @click="applyTags">{{ $t('enterprise.customers.index.confirmTag') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'user-workspace' });
import { formatDateLocale } from '~/utils/format';
const { t } = useI18n();

const router = useRouter();
const toast = useToast();
const customers = ref([]);
const tags = ref([]);
const loading = ref(true);
const keyword = ref('');
const statusFilter = ref('');
const tagFilter = ref('');
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const stats = reactive({ total: 0, activeToday: 0, newThisMonth: 0, withMembership: 0 });

const showTagPicker = ref(false);
const tagTarget = ref(null);
const selectedTags = ref([]);
const customerTagsMap = reactive({});

const $api = (url, opts) => $fetch(url, { baseURL: '/api/enterprise/customers', credentials: 'include', ...opts });

async function loadCustomers() {
  loading.value = true;
  try {
    const params = new URLSearchParams({ page: page.value, pageSize: pageSize.value });
    if (keyword.value) params.set('keyword', keyword.value);
    if (statusFilter.value) params.set('status', statusFilter.value);
    if (tagFilter.value) params.set('tagId', tagFilter.value);
    const data = await $api(`/?${params}`);
    customers.value = data.list || [];
    total.value = data.total || 0;
    (data.list || []).forEach(c => { if (c.customer_tags) customerTagsMap[c.id] = c.customer_tags; });
  } catch (e) { toast.error(t('enterprise.customers.index.loadFailed')); }
  loading.value = false;
}

async function loadStats() {
  try { Object.assign(stats, await $api('/stats')); } catch (e) { toast.error(t('enterprise.customers.index.statsLoadFailed')); }
}

async function loadTags() {
  try { tags.value = await $api('/tags'); } catch (e) { toast.error(t('enterprise.customers.index.tagsLoadFailed')); }
}

function getCustomerTags(cid) { return customerTagsMap[cid] || []; }

function goDetail(id) { router.push(`/enterprise/customers/${id}`); }

function openTagPicker(customer) {
  tagTarget.value = customer;
  selectedTags.value = (customerTagsMap[customer.id] || []).map(t => t.id);
  showTagPicker.value = true;
}

async function applyTags() {
  if (!tagTarget.value) return;
  try {
    for (const tagId of selectedTags.value) {
      await $api(`/tags/${tagId}/customers`, { method: 'POST', body: { userId: tagTarget.value.id } });
    }
    showTagPicker.value = false;
    loadCustomers();
  } catch (e) { toast.error(t('enterprise.customers.index.batchTagFailed')); }
}

function planLabel(type) {
  const map = { 1: t('enterprise.customers.index.memberMonthly'), 2: t('enterprise.customers.index.memberQuarterly'), 3: t('enterprise.customers.index.memberYearly') };
  return map[type] || t('enterprise.common.freeLabel');
}



onMounted(() => { loadCustomers(); loadStats(); loadTags(); });
</script>

<style scoped>
.ent-customers { max-width: 1200px; margin: 0 auto; padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-title { font-size: 24px; font-weight: 700; }
.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
.stat-card { background: var(--bg-card); border-radius: 8px; padding: 16px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
.stat-num { display: block; font-size: 28px; font-weight: 700; color: var(--color-brand-primary); }
.stat-label { font-size: 13px; color: var(--text-secondary); margin-top: 4px; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; }
.search-input { flex: 1; padding: 8px 12px; border: 1px solid var(--border-primary); border-radius: 6px; background: var(--bg-card); color: var(--text-primary); }
.filter-select { padding: 8px 12px; border: 1px solid var(--border-primary); border-radius: 6px; background: var(--bg-card); color: var(--text-primary); }
.table-wrap { background: var(--bg-card); border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,.1); overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border-light); font-size: 14px; }
th { font-weight: 600; color: var(--text-secondary); background: var(--bg-subtle); }
.status-tag { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; }
.status-tag.on { background: var(--success-bg); color: var(--color-success-700); }
.status-tag.off { background: var(--danger-bg); color: var(--color-danger-700); }
.tag-chip { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; color: var(--text-on-brand); margin-right: 4px; }
.actions { display: flex; gap: 8px; }
.btn-sm { padding: 4px 10px; font-size: 13px; border: 1px solid var(--border-primary); border-radius: 4px; background: var(--bg-card); cursor: pointer; color: var(--text-primary); }
.btn-sm.danger { color: var(--color-danger); border-color: var(--color-danger-soft); }
.btn-primary { padding: 8px 20px; background: var(--color-brand-primary); color: var(--text-inverse); border: none; border-radius: 6px; cursor: pointer; font-size: 14px; }
.btn-text { padding: 8px 16px; border: 1px solid var(--border-primary); border-radius: 6px; background: var(--bg-card); cursor: pointer; color: var(--text-primary); }
.empty { text-align: center; padding: 48px; color: var(--text-muted); }
.pager { display: flex; justify-content: center; align-items: center; gap: 16px; padding: 16px; font-size: 14px; }
.pager button:disabled { opacity: .4; cursor: not-allowed; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: var(--bg-card); border-radius: 12px; padding: 24px; min-width: 400px; max-width: 500px; }
.modal h3 { margin-bottom: 16px; font-size: 18px; }
.tag-list { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 24px; }
.tag-check { display: flex; align-items: center; gap: 6px; cursor: pointer; }
.modal-actions { display: flex; justify-content: flex-end; gap: 12px; }
.text-muted { color: var(--text-muted); }
</style>
