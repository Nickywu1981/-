<template>
  <AdminLayout>
    <div class="page-header">
      <h2 class="ptitle">套餐订单管理</h2>
    </div>

    <div class="filters">
      <input v-model="userId" type="text" placeholder="用户ID" @keyup.enter="search" />
      <select v-model="planType" @change="search">
        <option value="">全部套餐</option>
        <option value="1">月卡</option>
        <option value="2">季卡</option>
        <option value="3">年卡</option>
      </select>
      <button class="btn" @click="search">搜索</button>
    </div>

    <LoadingSkeleton v-if="loading" type="table" :rows="5" :cols="8" />

    <div class="table-wrap" v-else-if="list.length">
      <table class="table">
        <thead>
          <tr>
            <th>ID</th><th>用户</th><th>套餐</th><th>变动前</th><th>变动后</th>
            <th>获增点数</th><th>备注</th><th>购买时间</th><th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="o in list" :key="o.id">
            <td class="mono">{{ o.id }}</td>
            <td>{{ o.nickname || o.username || '-' }}</td>
            <td><span class="badge plan">{{ planLabel(o.plan_type) }}</span></td>
            <td>{{ o.credit_before }}</td>
            <td>{{ o.credit_after }}</td>
            <td class="earn">+{{ Math.abs(o.consumed) }} 点</td>
            <td class="remark-cell" :title="o.remark">{{ o.remark || '-' }}</td>
            <td class="time">{{ formatTime(o.create_time) }}</td>
            <td class="actions">
              <button class="btn-sm" @click="openDetail(o)">详情</button>
              <button class="btn-sm danger" @click="confirmDelete(o)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="!list.length && !loading" class="empty">暂无订单数据</div>

    <Pagination :page="page" :page-size="pageSize" :total="total" @change="onPageChange" />

    <!-- 详情弹窗 -->
    <Teleport to="body">
      <div v-if="detailOpen" class="modal-overlay" @click.self="detailOpen = false">
        <div class="modal">
          <div class="modal-header">
            <h3>订单详情 #{{ detail.id }}</h3>
            <button class="modal-close" @click="detailOpen = false">✕</button>
          </div>
          <div class="modal-body">
            <div class="detail-grid">
              <div class="detail-item"><span class="dl">订单ID</span><span class="dv mono">{{ detail.id }}</span></div>
              <div class="detail-item"><span class="dl">用户</span><span class="dv">{{ detail.nickname || detail.username || '-' }}</span></div>
              <div class="detail-item"><span class="dl">套餐</span><span class="dv">{{ planLabel(detail.plan_type) }}</span></div>
              <div class="detail-item"><span class="dl">变动前积分</span><span class="dv">{{ detail.credit_before }}</span></div>
              <div class="detail-item"><span class="dl">变动后积分</span><span class="dv">{{ detail.credit_after }}</span></div>
              <div class="detail-item"><span class="dl">获增点数</span><span class="dv earn">+{{ Math.abs(detail.consumed) }} 点</span></div>
              <div class="detail-item"><span class="dl">备注</span><span class="dv">{{ detail.remark || '-' }}</span></div>
              <div class="detail-item"><span class="dl">购买时间</span><span class="dv">{{ formatTime(detail.create_time) }}</span></div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </AdminLayout>
</template>

<script setup lang="ts">

const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const userId = ref('')
const planType = ref('')
const loading = ref(true)
const detailOpen = ref(false)
const detail = ref<any>({})

function planLabel(t: number | string) {
  const map: Record<string, string> = { '1': '月卡', '2': '季卡', '3': '年卡' }
  return map[String(t)] || '未知'
}
function formatTime(t: string) { return t?.slice(0, 16) || '-' }

async function fetch() {
  loading.value = true
  try {
    const params = new URLSearchParams({ page: String(page.value), pageSize: String(pageSize) })
    if (userId.value) params.set('userId', userId.value)
    if (planType.value) params.set('planType', planType.value)
    const data: any = await $fetch(`/api/admin/orders?${params.toString()}`)
    if (data?.code === 200) {
      list.value = data.data.list || []
      total.value = data.data.total || 0
    }
  } catch (e: any) { /* silently fail */ } finally { loading.value = false }
}

function search() { page.value = 1; fetch() }
function onPageChange(p: number) { page.value = p; fetch() }
function openDetail(o: any) { detail.value = o; detailOpen.value = true }

async function confirmDelete(o: any) {
  if (!confirm(`确认删除订单 #${o.id}？此操作不可撤销。`)) return
  try {
    await $fetch(`/api/admin/orders/${o.id}`, { method: 'DELETE' })
    list.value = list.value.filter(item => item.id !== o.id)
    total.value--
const toast = useToast()
  } catch (e: any) { toast.error('删除失败') }
}

onMounted(fetch)
</script>

<style scoped>
.ptitle { font-size: 20px; font-weight: 700; margin-bottom: 20px; color: var(--text-primary); }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.filters { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.filters input, .filters select { padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-md); font-size: 13px; background: var(--bg-card); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.filters input:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.filters input { width: 160px; }
.btn { padding: 8px 20px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: 13px; transition: opacity var(--transition-fast); }
.btn:hover { opacity: 0.9; }
.btn-sm { padding: 4px 10px; font-size: 12px; border-radius: var(--radius-sm); border: 1px solid var(--input-border); background: var(--bg-card); color: var(--text-primary); cursor: pointer; transition: all var(--transition-fast); }
.btn-sm:hover { background: var(--brand-subtle); border-color: var(--brand); color: var(--brand); }
.btn-sm.danger { color: var(--danger); border-color: transparent; }
.btn-sm.danger:hover { background: var(--danger-subtle); border-color: var(--danger); }
.table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.table { width: 100%; border-collapse: collapse; background: var(--bg-card); border-radius: var(--radius-lg); overflow: hidden; white-space: nowrap; font-size: 13px; }
.table th, .table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--table-border); }
.table th { background: var(--table-header-bg); font-weight: 600; color: var(--text-secondary); }
tr:hover td { background: var(--table-row-hover); }
.mono { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px; }
.earn { font-weight: 600; color: var(--success); }
.remark-cell { max-width: 120px; overflow: hidden; text-overflow: ellipsis; }
.time { font-size: 12px; color: var(--text-muted); }
.actions { display: flex; gap: 6px; }
.badge.plan { padding: 2px 8px; border-radius: var(--radius-sm); font-size: 12px; background: var(--brand-subtle); color: var(--brand); font-weight: 500; }
.empty { text-align: center; padding: 60px 0; color: var(--text-muted); }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; animation: fadeIn 0.2s ease; }
.modal { background: var(--bg-card); border-radius: var(--radius-xl); padding: 24px; max-width: 520px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: var(--shadow-xl); animation: slideUp 0.25s ease; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.modal-header h3 { font-size: 17px; font-weight: 700; color: var(--text-primary); margin: 0; }
.modal-close { background: none; border: none; font-size: 20px; cursor: pointer; color: var(--text-muted); padding: 4px; transition: color var(--transition-fast); }
.modal-close:hover { color: var(--text-primary); }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.detail-item { display: flex; flex-direction: column; gap: 2px; }
.dl { font-size: 11px; color: var(--text-muted); text-transform: uppercase; }
.dv { font-size: 14px; color: var(--text-primary); font-weight: 500; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>
