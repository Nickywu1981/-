<template>
  <AdminLayout>
    <div class="page-header">
      <h2>任务管理</h2>
    </div>

    <div class="filters">
      <select v-model="status" @change="search">
        <option value="">全部状态</option>
        <option value="0">排队中</option><option value="1">处理中</option><option value="2">已完成</option><option value="3">失败</option>
      </select>
      <select v-model="typeGroup" @change="search">
        <option value="">全部类型</option>
        <option value="image">图片</option><option value="video">视频</option><option value="batch">批量</option>
      </select>
      <input v-model="userId" type="text" placeholder="用户ID" @keyup.enter="search" />
      <button class="btn" @click="search">搜索</button>
    </div>

    <LoadingSkeleton v-if="loading" type="table" :rows="8" :cols="7" />

    <div v-else-if="error" class="error-state">
      <span class="error-icon">⚠️</span>
      <p>{{ error }}</p>
      <button class="retry-btn" @click="fetchData">重试</button>
    </div>

    <template v-else-if="list.length">
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr><th>ID</th><th>用户</th><th>类型</th><th>状态</th><th>消耗</th><th>进度</th><th>创建时间</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="t in list" :key="t.id" class="clickable" @click="openDetail(t)">
              <td class="mono">{{ t.id?.slice(0, 8) }}</td>
              <td>{{ t.nickname || t.username || '-' }}</td>
              <td>{{ typeLabel(t.type) }}</td>
              <td><span class="badge" :class="'s' + t.status">{{ statusLabel(t.status) }}</span></td>
              <td>{{ t.credits_consumed || 0 }}点</td>
              <td><div class="progress-bar"><div class="fill" :style="{ width: progress(t) + '%' }"></div></div></td>
              <td class="time">{{ t.create_time }}</td>
              <td class="actions" @click.stop>
                <button v-if="t.status === 3" class="btn-sm" @click="retryTask(t)">重试</button>
                <button v-if="t.status === 0 || t.status === 1" class="btn-sm danger" @click="cancelTask(t)">取消</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Pagination :page="page" :page-size="pageSize" :total="total" @change="onPageChange" />
    </template>
    <div v-else class="empty">暂无任务数据</div>

    <Teleport to="body">
      <div v-if="detailOpen" class="modal-overlay" @click.self="detailOpen = false">
        <div class="modal">
          <h3>任务详情</h3>
          <div class="detail-grid">
            <div class="detail-item"><span class="dl">任务ID</span><span class="dv mono">{{ detail.id }}</span></div>
            <div class="detail-item"><span class="dl">用户</span><span class="dv">{{ detail.nickname || detail.username || '-' }}</span></div>
            <div class="detail-item"><span class="dl">类型</span><span class="dv">{{ typeLabel(detail.type) }}</span></div>
            <div class="detail-item"><span class="dl">状态</span><span class="dv"><span class="badge" :class="'s' + detail.status">{{ statusLabel(detail.status) }}</span></span></div>
            <div class="detail-item"><span class="dl">消耗点数</span><span class="dv">{{ detail.credits_consumed || 0 }}点</span></div>
            <div class="detail-item"><span class="dl">进度</span><span class="dv">{{ progress(detail) }}%</span></div>
            <div class="detail-item"><span class="dl">创建时间</span><span class="dv">{{ detail.create_time }}</span></div>
            <div class="detail-item"><span class="dl">更新时间</span><span class="dv">{{ detail.update_time || '-' }}</span></div>
            <div class="detail-item full" v-if="detail.input_data"><span class="dl">输入参数</span><span class="dv"><pre>{{ JSON.stringify(detail.input_data, null, 2) }}</pre></span></div>
            <div class="detail-item full" v-if="detail.result_data"><span class="dl">结果数据</span><span class="dv"><pre>{{ JSON.stringify(detail.result_data, null, 2) }}</pre></span></div>
            <div class="detail-item full" v-if="detail.error_msg"><span class="dl">错误信息</span><span class="dv error-msg">{{ detail.error_msg }}</span></div>
          </div>
          <div class="modal-actions">
            <button v-if="detail.status === 3" class="btn-save" @click="retryTask(detail); detailOpen = false">重试任务</button>
            <button v-if="detail.status === 0 || detail.status === 1" class="btn-danger" @click="cancelTask(detail); detailOpen = false">取消任务</button>
            <button class="btn-cancel" @click="detailOpen = false">关闭</button>
          </div>
        </div>
      </div>
    </Teleport>
  </AdminLayout>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
import AdminLayout from '~/components/AdminLayout.vue'

const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 30
const status = ref('')
const typeGroup = ref('')
const userId = ref('')
const loading = ref(true)
const error = ref('')
const detailOpen = ref(false)
const detail = ref<any>({})

const toast = useToast()

function statusLabel(s: number) { const m: Record<number, string> = { 0: '排队', 1: '处理中', 2: '完成', 3: '失败' }; return m[s] || '未知' }
function typeLabel(t: string) { const m: Record<string, string> = { image: '图片', video: '视频', batch: '批量', 'main-image': '主图', scene: '场景', 'detail-h5': '详情页' }; return m[t] || t || '-' }
function progress(t: any) { if (t.status === 2) return 100; if (t.status === 3) return 100; if (t.status === 1) return 50; return 0 }

async function fetchData() {
  loading.value = true; error.value = ''
  try {
    const res: any = await $fetch('/api/admin/tasks', { params: { page: page.value, pageSize, status: status.value, typeGroup: typeGroup.value, userId: userId.value } })
    if (res?.code === 200) { list.value = res.data?.list || []; total.value = res.data?.total || 0 }
    else { throw new Error(res?.msg || '获取任务列表失败') }
  } catch (e: any) { error.value = e.message || '加载失败'; toast.error(error.value) } finally { loading.value = false }
}

function search() { page.value = 1; fetchData() }
function onPageChange(p: number) { page.value = p; fetchData() }
function openDetail(t: any) { detail.value = t; detailOpen.value = true }

async function retryTask(t: any) {
  try {
    const res: any = await $fetch(`/api/admin/tasks/${t.id}/retry`, { method: 'POST' })
    if (res?.code === 200) { toast.success('任务已重新提交'); fetchData() }
    else { toast.error(res?.msg || '重试失败') }
  } catch (e: any) { toast.error(e.message || '重试失败') }
}

async function cancelTask(t: any) {
  if (!confirm('确认取消该任务？')) return
  try {
    const res: any = await $fetch(`/api/admin/tasks/${t.id}/cancel`, { method: 'POST' })
    if (res?.code === 200) { toast.success('任务已取消'); fetchData() }
    else { toast.error(res?.msg || '取消失败') }
  } catch (e: any) { toast.error(e.message || '取消失败') }
}

onMounted(fetchData)
</script>

<style scoped>
.page-header { margin-bottom: 20px; }
h2 { font-size: 22px; font-weight: 700; color: var(--text-primary); }

.filters { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.filters select, .filters input { padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-md); font-size: 13px; outline: none; background: var(--bg-input); color: var(--text-primary); transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.filters select:focus, .filters input:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.btn { padding: 8px 16px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: 13px; transition: opacity var(--transition-fast); }
.btn:hover { opacity: 0.9; }

.table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.table { width: 100%; border-collapse: collapse; background: var(--bg-card); border-radius: var(--radius-lg); overflow: hidden; white-space: nowrap; }
.table th, .table td { padding: 10px 12px; font-size: 13px; text-align: left; border-bottom: 1px solid var(--table-border); }
.table th { background: var(--table-header-bg); font-weight: 600; color: var(--text-secondary); }
tr.clickable { cursor: pointer; transition: background var(--transition-fast); }
tr.clickable:hover { background: var(--table-row-hover); }
tr:hover td { background: var(--table-row-hover); }
.mono { font-family: monospace; font-size: 12px; }
.time { font-size: 11px; color: var(--text-muted); white-space: nowrap; }
.actions { display: flex; gap: 6px; }

.badge { padding: 2px 8px; border-radius: var(--badge-radius); font-size: var(--badge-font-size); }
.badge.s0 { background: var(--status-pending-bg); color: var(--status-pending-text); }
.badge.s1 { background: var(--status-processing-bg); color: var(--status-processing-text); }
.badge.s2 { background: var(--status-done-bg); color: var(--status-done-text); }
.badge.s3 { background: var(--status-fail-bg); color: var(--status-fail-text); }
.progress-bar { width: 60px; height: 4px; background: var(--border-light); border-radius: 2px; overflow: hidden; }
.progress-bar .fill { height: 100%; background: var(--brand); border-radius: 2px; transition: width var(--transition-slow); }

.error-state { text-align: center; padding: 60px 20px; }
.error-icon { font-size: 48px; }
.error-state p { color: var(--text-muted); margin: 12px 0 20px; font-size: 14px; }
.retry-btn { padding: 8px 24px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: 14px; transition: opacity var(--transition-fast); }
.retry-btn:hover { opacity: 0.9; }
.empty { text-align: center; padding: 40px; color: var(--text-muted); }

.btn-sm { padding: 4px 12px; border: 1px solid var(--border-light); border-radius: var(--radius-xs); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 12px; transition: all var(--transition-fast); }
.btn-sm:hover { border-color: var(--brand); color: var(--brand); }
.btn-sm.danger { color: var(--danger); border-color: var(--danger); }
.btn-sm.danger:hover { background: var(--danger); color: #fff; }

.modal-overlay { position: fixed; inset: 0; background: var(--modal-overlay); z-index: 5000; display: flex; align-items: center; justify-content: center; animation: overlay-fade-in var(--transition-base); }
.modal { background: var(--bg-card); border-radius: var(--modal-radius); padding: var(--modal-padding); width: 90%; max-width: 600px; max-height: 80vh; overflow-y: auto; box-shadow: var(--modal-shadow); animation: modal-enter var(--transition-slow); }
.modal h3 { font-size: 17px; font-weight: 600; margin-bottom: 20px; color: var(--text-primary); }
.detail-grid { display: flex; flex-direction: column; gap: 10px; }
.detail-item { display: flex; gap: 12px; align-items: flex-start; }
.detail-item.full { flex-direction: column; gap: 4px; }
.dl { font-size: 12px; color: var(--text-muted); min-width: 80px; flex-shrink: 0; }
.dv { font-size: 13px; color: var(--text-primary); word-break: break-all; }
.dv pre { background: var(--bg-hover); padding: 10px; border-radius: var(--radius-sm); font-size: 12px; overflow-x: auto; max-height: 200px; color: var(--text-primary); }
.error-msg { color: var(--danger); background: var(--status-fail-bg); padding: 8px 12px; border-radius: var(--radius-sm); }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
.btn-cancel { padding: 8px 20px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 13px; transition: all var(--transition-fast); }
.btn-cancel:hover { border-color: var(--text-muted); }
.btn-save { padding: 8px 20px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; transition: opacity var(--transition-fast); }
.btn-save:hover { opacity: 0.9; }
.btn-danger { padding: 8px 20px; background: var(--danger); color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; transition: opacity var(--transition-fast); }
.btn-danger:hover { opacity: 0.9; }

@media (max-width: 640px) {
  h2 { font-size: 18px; }
  .filters { flex-direction: column; }
  .filters select, .filters input { width: 100%; }
}
</style>
