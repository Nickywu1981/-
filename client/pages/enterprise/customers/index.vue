<template>
  <div class="ent-customers">
    <div class="page-header">
      <h1 class="page-title">客户管理</h1>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card"><span class="stat-num">{{ stats.total }}</span><span class="stat-label">客户总数</span></div>
      <div class="stat-card"><span class="stat-num">{{ stats.activeToday }}</span><span class="stat-label">今日活跃</span></div>
      <div class="stat-card"><span class="stat-num">{{ stats.newThisMonth }}</span><span class="stat-label">本月新增</span></div>
      <div class="stat-card"><span class="stat-num">{{ stats.withMembership }}</span><span class="stat-label">付费会员</span></div>
    </div>

    <!-- 搜索/筛选 -->
    <div class="toolbar">
      <input v-model="keyword" placeholder="搜索用户名/昵称/手机号" class="search-input" @keyup.enter="loadCustomers" />
      <select v-model="statusFilter" @change="loadCustomers" class="filter-select">
        <option value="">全部状态</option>
        <option value="1">启用</option>
        <option value="0">禁用</option>
      </select>
      <select v-model="tagFilter" @change="loadCustomers" class="filter-select">
        <option value="">全部标签</option>
        <option v-for="t in tags" :key="t.id" :value="t.id">{{ t.name }}</option>
      </select>
      <button class="btn-text" @click="loadCustomers">搜索</button>
    </div>

    <!-- 客户列表 -->
    <div class="table-wrap" v-if="!loading">
      <table v-if="customers.length">
        <thead>
          <tr><th>用户名</th><th>昵称</th><th>手机号</th><th>会员</th><th>标签</th><th>状态</th><th>注册时间</th><th>操作</th></tr>
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
            <td><span :class="['status-tag', c.status === 1 ? 'on' : 'off']">{{ c.status === 1 ? '启用' : '禁用' }}</span></td>
            <td>{{ formatDate(c.create_time) }}</td>
            <td class="actions">
              <button class="btn-sm" @click="goDetail(c.id)">详情</button>
              <button class="btn-sm" @click="openTagPicker(c)">打标</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">暂无客户数据</div>

      <div class="pager" v-if="total > pageSize">
        <button :disabled="page <= 1" @click="page--; loadCustomers()">上一页</button>
        <span>第 {{ page }} / {{ Math.ceil(total / pageSize) }} 页</span>
        <button :disabled="page >= Math.ceil(total / pageSize)" @click="page++; loadCustomers()">下一页</button>
      </div>
    </div>

    <!-- 打标弹窗 -->
    <div class="modal-overlay" v-if="showTagPicker" @click.self="showTagPicker = false">
      <div class="modal">
        <h3>为客户打标 — {{ tagTarget?.nickname || tagTarget?.username }}</h3>
        <div class="tag-list">
          <label v-for="t in tags" :key="t.id" class="tag-check">
            <input type="checkbox" :value="t.id" v-model="selectedTags" />
            <span class="tag-chip" :style="{ background: t.color }">{{ t.name }}</span>
          </label>
        </div>
        <div class="modal-actions">
          <button class="btn-text" @click="showTagPicker = false">取消</button>
          <button class="btn-primary" @click="applyTags">确认打标</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
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
    const data = await $api(`/customers?${params}`);
    customers.value = data.list || [];
    total.value = data.total || 0;
    (data.list || []).forEach(c => { if (c.customer_tags) customerTagsMap[c.id] = c.customer_tags; });
  } catch (e) { console.error(e); toast.error('客户列表加载失败'); }
  loading.value = false;
}

async function loadStats() {
  try { Object.assign(stats, await $api('/customers/stats')); } catch (e) { console.error(e); }
}

async function loadTags() {
  try { tags.value = await $api('/tags'); } catch (e) { console.error(e); }
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
  } catch (e) { console.error(e); }
}

function planLabel(type) {
  const map = { 1: '月卡', 2: '季卡', 3: '年卡' };
  return map[type] || '免费';
}

function formatDate(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : '-'; }

onMounted(() => { loadCustomers(); loadStats(); loadTags(); });
</script>

<style scoped>
.ent-customers { max-width: 1200px; margin: 0 auto; padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-title { font-size: 24px; font-weight: 700; }
.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
.stat-card { background: #fff; border-radius: 8px; padding: 16px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
.stat-num { display: block; font-size: 28px; font-weight: 700; color: #3B82F6; }
.stat-label { font-size: 13px; color: #6b7280; margin-top: 4px; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; }
.search-input { flex: 1; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; }
.filter-select { padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; }
.table-wrap { background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,.1); overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
th { font-weight: 600; color: #6b7280; background: #f9fafb; }
.status-tag { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; }
.status-tag.on { background: #d1fae5; color: #065f46; }
.status-tag.off { background: #fee2e2; color: #991b1b; }
.tag-chip { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; color: #fff; margin-right: 4px; }
.actions { display: flex; gap: 8px; }
.btn-sm { padding: 4px 10px; font-size: 13px; border: 1px solid #d1d5db; border-radius: 4px; background: #fff; cursor: pointer; }
.btn-sm.danger { color: #dc2626; border-color: #fca5a5; }
.btn-primary { padding: 8px 20px; background: #3B82F6; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; }
.btn-text { padding: 8px 16px; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; cursor: pointer; }
.empty { text-align: center; padding: 48px; color: #9ca3af; }
.pager { display: flex; justify-content: center; align-items: center; gap: 16px; padding: 16px; font-size: 14px; }
.pager button:disabled { opacity: .4; cursor: not-allowed; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: #fff; border-radius: 12px; padding: 24px; min-width: 400px; max-width: 500px; }
.modal h3 { margin-bottom: 16px; font-size: 18px; }
.tag-list { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 24px; }
.tag-check { display: flex; align-items: center; gap: 6px; cursor: pointer; }
.modal-actions { display: flex; justify-content: flex-end; gap: 12px; }
.text-muted { color: #9ca3af; }
</style>
