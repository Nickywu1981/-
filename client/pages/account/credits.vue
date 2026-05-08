<template>
  <div class="account-page">
    <h2>积分明细</h2>
    <div class="credit-summary">
      <div class="stat"><span class="val">{{ balance }}</span><span class="lbl">当前积分</span></div>
      <div class="stat"><span class="val in">{{ totalIn }}</span><span class="lbl">累计获得</span></div>
      <div class="stat"><span class="val out">{{ totalOut }}</span><span class="lbl">累计消耗</span></div>
    </div>
    <div v-if="loading" class="skeleton"><div v-for="i in 5" :key="i" class="skel-row" /></div>
    <div v-else-if="error" class="error-msg">{{ error }} <button @click="fetchRecords">重试</button></div>
    <table v-else-if="records.length" class="credits-table">
      <thead><tr><th>时间</th><th>类型</th><th>金额</th><th>余额</th><th>备注</th></tr></thead>
      <tbody>
        <tr v-for="r in records" :key="r.id">
          <td>{{ formatDate(r.created_at) }}</td>
          <td><span :class="['badge', r.type === 'earn' ? 'badge-in' : 'badge-out']">{{ r.type === 'earn' ? '获得' : '消耗' }}</span></td>
          <td :class="r.type === 'earn' ? 'text-in' : 'text-out'">{{ r.type === 'earn' ? '+' : '-' }}{{ r.amount }}</td>
          <td>{{ r.balance }}</td>
          <td>{{ r.remark || '-' }}</td>
        </tr>
      </tbody>
    </table>
    <div v-else class="empty">暂无积分记录</div>
    <Pagination v-if="total > pageSize" :page="page" :total="total" :page-size="pageSize" @change="goPage" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const records = ref<any[]>([])
const balance = ref(0)
const totalIn = ref(0)
const totalOut = ref(0)
const loading = ref(true)
const error = ref('')
const page = ref(1)
const total = ref(0)
const pageSize = ref(20)

onMounted(() => { fetchRecords() })

async function fetchRecords() {
  loading.value = true; error.value = ''
  try {
    const data: any = await $fetch(`/api/credits/records?page=${page.value}&pageSize=${pageSize.value}`, { credentials: 'include' })
    if (data.code === 200) {
      records.value = data.data.list || []
      total.value = data.data.total || 0
      balance.value = data.data.balance || 0
      totalIn.value = data.data.totalIn || 0
      totalOut.value = data.data.totalOut || 0
    } else { error.value = data.msg || '加载失败' }
  } catch (e: any) { error.value = e?.data?.msg || e.message || '加载失败' }
  finally { loading.value = false }
}
function goPage(p: number) { page.value = p; fetchRecords() }
function formatDate(d: string) { return d ? new Date(d).toLocaleString('zh-CN') : '-' }
</script>

<style scoped>
.account-page { max-width: 960px; margin: 0 auto; padding: 32px 24px; }
h2 { font-size: 24px; font-weight: 700; margin-bottom: 24px; color: var(--text-primary); }
.credit-summary { display: flex; gap: 24px; margin-bottom: 32px; }
.stat { flex: 1; background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 20px; text-align: center; }
.val { display: block; font-size: 28px; font-weight: 800; color: var(--brand); }
.val.in { color: var(--success); } .val.out { color: var(--danger); }
.lbl { font-size: 13px; color: var(--text-secondary); margin-top: 4px; display: block; }
.credits-table { width: 100%; border-collapse: collapse; background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
.credits-table th, .credits-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border); font-size: 14px; }
.credits-table th { background: var(--bg-secondary); font-weight: 600; color: var(--text-secondary); font-size: 13px; }
.badge { padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
.badge-in { background: var(--success-bg); color: var(--success); }
.badge-out { background: var(--danger-bg); color: var(--danger); }
.text-in { color: var(--success); font-weight: 600; } .text-out { color: var(--danger); font-weight: 600; }
.skeleton { display: flex; flex-direction: column; gap: 8px; }
.skel-row { height: 40px; background: var(--bg-secondary); border-radius: 8px; animation: pulse 1.5s infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
.error-msg { padding: 40px; text-align: center; color: var(--danger); }
.error-msg button { margin-left: 12px; color: var(--brand); cursor: pointer; border: none; background: none; font-weight: 600; }
.empty { padding: 60px 0; text-align: center; color: var(--text-tertiary); }
</style>
