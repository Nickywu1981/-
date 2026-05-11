<template>
  <div class="ent-customer-detail">
    <div class="page-header">
      <button class="btn-back" @click="$router.back()">&larr; {{ $t('enterprise.customers.detail.back') }}</button>
      <h1 class="page-title">{{ customer.nickname || customer.username }}</h1>
    </div>

    <div v-if="loading" class="empty">{{ $t('enterprise.common.loading') }}</div>
    <template v-else-if="customer">
      <!-- 基本信息 -->
      <div class="card">
        <h3>{{ $t('enterprise.customers.detail.basicInfo') }}</h3>
        <div class="info-grid">
          <div class="info-item"><span class="label">{{ $t('enterprise.customers.detail.username') }}</span><span>{{ customer.username }}</span></div>
          <div class="info-item"><span class="label">{{ $t('enterprise.customers.detail.nickname') }}</span><span>{{ customer.nickname || '-' }}</span></div>
          <div class="info-item"><span class="label">{{ $t('enterprise.customers.detail.phone') }}</span><span>{{ customer.phone || '-' }}</span></div>
          <div class="info-item"><span class="label">{{ $t('enterprise.customers.detail.email') }}</span><span>{{ customer.email || '-' }}</span></div>
          <div class="info-item"><span class="label">{{ $t('enterprise.customers.detail.status') }}</span><span :class="customer.status === 1 ? 'text-green' : 'text-red'">{{ customer.status === 1 ? $t('enterprise.customers.detail.statusNormal') : $t('enterprise.common.statusDisabled') }}</span></div>
          <div class="info-item"><span class="label">{{ $t('enterprise.customers.detail.registeredAt') }}</span><span>{{ formatDateTimeLocale(customer.create_time) }}</span></div>
          <div class="info-item"><span class="label">{{ $t('enterprise.customers.detail.lastLogin') }}</span><span>{{ formatDateTimeLocale(customer.last_login_time) }}</span></div>
        </div>
      </div>

      <!-- 会员信息 -->
      <div class="card">
        <h3>{{ $t('enterprise.customers.detail.memberInfo') }}</h3>
        <div class="info-grid">
          <div class="info-item"><span class="label">{{ $t('enterprise.customers.detail.memberLevel') }}</span><span>{{ planLabel(customer.plan_type) }}</span></div>
          <div class="info-item"><span class="label">{{ $t('enterprise.customers.detail.pointsBalance') }}</span><span>{{ customer.credit_balance ?? 0 }}</span></div>
          <div class="info-item"><span class="label">{{ $t('enterprise.customers.detail.memberStart') }}</span><span>{{ formatDateTimeLocale(customer.membership_start) }}</span></div>
          <div class="info-item"><span class="label">{{ $t('enterprise.customers.detail.memberExpire') }}</span><span>{{ formatDateTimeLocale(customer.membership_end) }}</span></div>
        </div>
      </div>

      <!-- 标签 -->
      <div class="card">
        <h3>{{ $t('enterprise.customers.detail.customerTags') }}</h3>
        <div class="tag-row">
          <span v-for="t in customer.tags" :key="t.id" class="tag-chip" :style="{ background: t.color }">{{ t.name }}</span>
          <span v-if="!customer.tags?.length" class="text-muted">{{ $t('enterprise.customers.detail.noTags') }}</span>
        </div>
      </div>

      <!-- 统计 -->
      <div class="card">
        <h3>{{ $t('enterprise.customers.detail.usageStats') }}</h3>
        <div class="stats-row">
          <div class="stat-card"><span class="stat-num">{{ customer.stats?.taskTotal || 0 }}</span><span class="stat-label">{{ $t('enterprise.customers.detail.totalTasks') }}</span></div>
          <div class="stat-card"><span class="stat-num">&yen;{{ customer.stats?.totalSpent || 0 }}</span><span class="stat-label">{{ $t('enterprise.customers.detail.totalSpent') }}</span></div>
        </div>
      </div>

      <!-- 消费记录 -->
      <div class="card">
        <h3>{{ $t('enterprise.customers.detail.recentOrders') }}</h3>
        <table v-if="customer.recentOrders?.length">
          <thead><tr><th>{{ $t('enterprise.customers.detail.orderType') }}</th><th>{{ $t('enterprise.customers.detail.amount') }}</th><th>{{ $t('enterprise.customers.detail.remark') }}</th><th>{{ $t('enterprise.customers.detail.time') }}</th></tr></thead>
          <tbody>
            <tr v-for="o in customer.recentOrders" :key="o.id">
              <td>{{ orderActionLabel(o.action) }}</td>
              <td>&yen;{{ o.consumed || 0 }}</td>
              <td>{{ o.remark || '-' }}</td>
              <td>{{ formatDateTimeLocale(o.create_time) }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty">{{ $t('enterprise.customers.detail.noOrders') }}</div>
      </div>
    </template>
    <div v-else class="empty">{{ $t('enterprise.customers.detail.notFound') }}</div>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'enterprise' });
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { formatDateTimeLocale } from '~/utils/format';

const { t } = useI18n()
const route = useRoute();
const customer = ref(null);
const loading = ref(true);

const $api = (url) => $fetch(url, { baseURL: '/api/enterprise/customers', credentials: 'include' });

async function loadDetail() {
  try {
    customer.value = await $api(`/${route.params.id}`);
  } catch (e) { customer.value = null; }
  loading.value = false;
}

function planLabel(type) { const map = { 1: t('enterprise.customers.index.memberMonthly'), 2: t('enterprise.customers.index.memberQuarterly'), 3: t('enterprise.customers.index.memberYearly') }; return map[type] || t('enterprise.common.freeLabel'); }
function orderActionLabel(a) {
  const map = { purchase_plan_1: t('enterprise.customers.index.memberMonthly'), purchase_plan_2: t('enterprise.customers.index.memberQuarterly'), purchase_plan_3: t('enterprise.customers.index.memberYearly') };
  return map[a] || a || '-';
}

onMounted(loadDetail);
</script>

<style scoped>
.ent-customer-detail { max-width: 900px; margin: 0 auto; padding: 24px; }
.page-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
.btn-back { padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; cursor: pointer; }
.page-title { font-size: 24px; font-weight: 700; }
.card { background: #fff; border-radius: 8px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
.card h3 { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
.info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.info-item { display: flex; flex-direction: column; gap: 4px; }
.info-item .label { font-size: 12px; color: #6b7280; }
.stats-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.stat-card { background: #f9fafb; border-radius: 6px; padding: 12px; text-align: center; }
.stat-num { display: block; font-size: 22px; font-weight: 700; color: #3B82F6; }
.stat-label { font-size: 12px; color: #6b7280; }
.tag-row { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-chip { padding: 4px 12px; border-radius: 999px; font-size: 13px; color: #fff; }
.text-green { color: #065f46; }
.text-red { color: #991b1b; }
.text-muted { color: #9ca3af; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
th { font-weight: 600; color: #6b7280; }
.empty { text-align: center; padding: 32px; color: #9ca3af; }
</style>
