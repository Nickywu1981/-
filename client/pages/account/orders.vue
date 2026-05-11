<template>
  <div class="account-page">
    <h2>我的订单</h2>
    <div class="tabs">
      <button v-for="t in tabs" :key="t.key" :class="{ active: activeTab === t.key }" @click="activeTab = t.key; fetchOrders()">{{ t.label }}</button>
    </div>
    <div v-if="loading" class="skeleton"><div v-for="i in 5" :key="i" class="skel-row" /></div>
    <div v-else-if="error" class="error-msg">{{ error }} <button @click="fetchOrders">重试</button></div>
    <div v-else-if="orders.length" class="table-wrap">
      <table class="orders-table">
        <thead><tr><th>订单号</th><th>套餐</th><th>金额</th><th>状态</th><th>时间</th></tr></thead>
        <tbody>
          <tr v-for="o in orders" :key="o.id">
            <td class="order-no">{{ o.order_no || o.id }}</td>
            <td>{{ o.plan_name || '-' }}</td>
            <td class="amount">&yen;{{ o.amount }}</td>
            <td><span :class="['badge', statusClass(o.status)]">{{ statusLabel(o.status) }}</span></td>
            <td>{{ formatDateTime(o.created_at) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="empty">暂无订单记录</div>
    <Pagination v-if="total > pageSize" :page="page" :total="total" :page-size="pageSize" @change="goPage" />
  </div>
</template>

<script setup lang="ts">
import { formatDateTime } from '@/utils/format'

const orders = ref<any[]>([])
const loading = ref(true)
const error = ref('')
const page = ref(1)
const total = ref(0)
const pageSize = ref(20)
const activeTab = ref('all')
const tabs = [{ key: 'all', label: '全部' }, { key: 'paid', label: '已支付' }, { key: 'refunded', label: '已退款' }, { key: 'cancelled', label: '已取消' }]

onMounted(() => { fetchOrders() })

async function fetchOrders() {
  loading.value = true; error.value = ''
  try {
    const status = activeTab.value === 'all' ? '' : `&status=${activeTab.value}`
    const data: any = await $fetch(`/api/payment/orders?page=${page.value}&pageSize=${pageSize.value}${status}`, { credentials: 'include' })
    if (data.code === 200) { orders.value = data.data.list || []; total.value = data.data.total || 0 }
    else { error.value = data.msg || '加载失败' }
  } catch (e: any) { error.value = e?.data?.msg || e.message || '加载失败' }
  finally { loading.value = false }
}
function goPage(p: number) { page.value = p; fetchOrders() }
function statusClass(s: string) { const m: Record<string,string> = { paid:'badge-ok', refunded:'badge-warn', cancelled:'badge-err' }; return m[s] || '' }
function statusLabel(s: string) { const m: Record<string,string> = { paid:'已支付', pending:'待支付', refunded:'已退款', cancelled:'已取消' }; return m[s] || s }
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.account-page { max-width: 960px; margin: 0 auto; padding: 32px 24px; }
h2 { font-size: 24px; font-weight: 700; margin-bottom: 20px; color: var(--text-primary); }
.tabs { display: flex; gap: 4px; margin-bottom: 24px; background: var(--bg-secondary); border-radius: 10px; padding: 4px; width: fit-content; }
.tabs button { padding: 8px 20px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; background: transparent; color: var(--text-secondary); transition: background 0.2s, color 0.2s, box-shadow 0.2s; }
.tabs button.active { background: var(--card-bg); color: var(--brand); font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.orders-table { width: 100%; border-collapse: collapse; background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; min-width: 560px; }
.orders-table th, .orders-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border); font-size: 14px; }
.orders-table th { background: var(--bg-secondary); font-weight: 600; color: var(--text-secondary); font-size: 13px; }
.order-no { font-family: monospace; font-size: 13px; color: var(--text-secondary); }
.amount { font-weight: 700; color: var(--text-primary); }
.badge { padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
.badge-ok { background: var(--success-bg); color: var(--success); }
.badge-warn { background: var(--warning-bg); color: var(--warning); }
.badge-err { background: var(--danger-bg); color: var(--danger); }
.skeleton { display: flex; flex-direction: column; gap: 8px; }
.skel-row { height: 40px; background: var(--bg-secondary); border-radius: 8px; animation: pulse 1.5s infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
.error-msg { padding: 40px; text-align: center; color: var(--danger); }
.error-msg button { margin-left: 12px; color: var(--brand); cursor: pointer; border: none; background: none; font-weight: 600; }
.empty { padding: 60px 0; text-align: center; color: var(--text-tertiary); }
</style>
