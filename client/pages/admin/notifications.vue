<template>
  <AdminLayout>
    <h2 class="ptitle">通知中心管理</h2>

    <div class="filters">
      <input v-model="filterUserId" type="text" placeholder="用户ID" @keyup.enter="search" />
      <select v-model="filterType" @change="search">
        <option value="">全部类型</option>
        <option value="system">系统通知</option>
        <option value="task">任务通知</option>
        <option value="credit">积分通知</option>
      </select>
      <button class="btn" @click="search">搜索</button>
      <button class="btn btn-send" @click="sendDialog.open = true">+ 发送通知</button>
    </div>

    <LoadingSkeleton v-if="loading" type="table" :rows="5" :cols="7" />

    <div class="table-wrap" v-else-if="list.length">
      <table class="table">
        <thead>
          <tr>
            <th>ID</th><th>用户</th><th>类型</th><th>标题</th><th>内容</th><th>状态</th><th>时间</th><th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="n in list" :key="n.id">
            <td>{{ n.id }}</td>
            <td>{{ n.nickname || '-' }} <span class="uid">({{ n.user_id }})</span></td>
            <td><span class="badge" :class="'nf-' + n.type">{{ typeLabel(n.type) }}</span></td>
            <td class="fw6">{{ n.title }}</td>
            <td class="content-cell">{{ n.content }}</td>
            <td>{{ n.is_read ? '已读' : '未读' }}</td>
            <td>{{ n.create_time?.slice(0, 16) }}</td>
            <td><button class="btn-sm btn-del" @click="doDelete(n)">删除</button></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="!list.length && !loading" class="empty">暂无通知</div>

    <Pagination :page="page" :page-size="pageSize" :total="total" @change="onPageChange" />

    <!-- Send Dialog -->
    <div v-if="sendDialog.open" class="modal-overlay" @click.self="sendDialog.open = false">
      <div class="modal-box">
        <h4>发送通知</h4>
        <input v-model="sendDialog.userId" type="number" min="1" placeholder="用户ID *" />
        <select v-model="sendDialog.type">
          <option value="system">系统通知</option>
          <option value="task">任务通知</option>
          <option value="credit">积分通知</option>
        </select>
        <input v-model="sendDialog.title" maxlength="100" type="text" placeholder="通知标题 *" />
        <textarea v-model="sendDialog.content" maxlength="5000" placeholder="通知内容 *" rows="3"></textarea>
        <div class="modal-actions">
          <button class="btn-cancel" @click="sendDialog.open = false">取消</button>
          <button class="btn" @click="confirmSend">发送</button>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import type { ApiResponse } from '~/composables/useApi'

const { confirm } = useConfirm()

const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const filterUserId = ref('')
const filterType = ref('')
const loading = ref(true)
const toast = useToast()

const sendDialog = reactive({ open: false, userId: '', type: 'system', title: '', content: '' })

function typeLabel(t: string) { return t === 'system' ? '系统' : t === 'task' ? '任务' : t === 'credit' ? '积分' : t }

async function fetch() {
  loading.value = true
  try {
    const params = new URLSearchParams({ page: String(page.value), pageSize: String(pageSize) })
    if (filterUserId.value) params.set('userId', filterUserId.value)
    if (filterType.value) params.set('type', filterType.value)
    const data = await $fetch(`/api/notifications/admin/all?${params.toString()}`, { credentials: 'include' }) as ApiResponse<{list: any[], total: number}>
    if (data?.code === 200) {
      list.value = data.data.list || []
      total.value = data.data.total || 0
    }
  } catch (e: any) { toast.error('加载失败') } finally { loading.value = false }
}

function search() { page.value = 1; fetch() }
function onPageChange(p: number) { page.value = p; fetch() }

async function confirmSend() {
  if (!sendDialog.userId || !sendDialog.title || !sendDialog.content) { toast.warn('请填写完整信息'); return }
  try {
    const data = await $fetch('/api/notifications/send', { method: 'POST', credentials: 'include', body: { userId: +sendDialog.userId, type: sendDialog.type, title: sendDialog.title, content: sendDialog.content } }) as ApiResponse
    if (data?.code === 200) { toast.success('已发送'); sendDialog.open = false; fetch() }
    else { toast.error(data?.msg || '发送失败') }
  } catch (e: any) { toast.error('发送失败') }
}

async function doDelete(n: any) {
  if (!await confirm({ message: `确定删除通知 #${n.id}？`} )) return
  try {
    const data = await $fetch(`/api/notifications/${n.id}`, { method: 'DELETE', credentials: 'include' }) as ApiResponse
    if (data?.code === 200) { toast.success('已删除'); fetch() }
    else { toast.error(data?.msg || '删除失败') }
  } catch (e: any) { toast.error('删除失败') }
}

onMounted(fetch)
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.ptitle { font-size: 20px; font-weight: 700; margin-bottom: 20px; color: var(--text-primary); }
.filters { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
.filters input, .filters select { padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-md); font-size: 13px; background: var(--bg-card); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.filters input:focus, .filters select:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.filters input { width: 160px; }
.btn { padding: 8px 20px; background: var(--brand-gradient); color: #fff; border: none; border-radius: var(--radius-md); font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity var(--transition-fast), transform var(--transition-fast), box-shadow var(--transition-fast); }
.btn:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: var(--shadow-md); }
.btn-send { background: linear-gradient(135deg, var(--success), var(--success-light, #34D399)); }
.table-wrap { overflow-x: auto; border-radius: var(--radius-lg); border: 1px solid var(--border-light); background: var(--bg-card); }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table th { background: var(--bg-secondary); color: var(--text-secondary); font-weight: 600; padding: 12px 10px; text-align: left; white-space: nowrap; border-bottom: 1px solid var(--border-light); }
.table td { padding: 10px; border-bottom: 1px solid var(--border-light); color: var(--text-primary); }
.table tbody tr { transition: background var(--transition-fast); }
.table tbody tr:hover { background: var(--bg-hover); }
.content-cell { max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fw6 { font-weight: 600; }
.uid { color: var(--text-muted); font-size: 11px; }
.empty { text-align: center; padding: 60px 20px; color: var(--text-muted); font-size: 14px; }
.badge { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.nf-system { background: var(--brand-bg); color: var(--brand); }
.nf-task { background: var(--info-bg); color: var(--info); }
.nf-credit { background: var(--warning-bg); color: var(--warning); }
.btn-sm { padding: 4px 12px; border-radius: var(--radius-sm); font-size: 12px; cursor: pointer; border: none; transition: border-color var(--transition-fast), color var(--transition-fast); }
.btn-del { background: var(--danger-bg); color: var(--danger); }
.btn-del:hover { background: var(--danger); color: #fff; }
/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 300; }
.modal-box { background: var(--bg-card); border-radius: var(--radius-lg); padding: 24px; width: 440px; max-width: 90vw; box-shadow: var(--shadow-xl); display: flex; flex-direction: column; gap: 12px; }
.modal-box h4 { font-size: 16px; font-weight: 700; color: var(--text-primary); }
.modal-box input, .modal-box select, .modal-box textarea { padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-md); font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast); font-family: inherit; }
.modal-box input:focus, .modal-box select:focus, .modal-box textarea:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.modal-box textarea { resize: vertical; }
.modal-actions { display: flex; gap: 8px; justify-content: flex-end; }
.btn-cancel { padding: 8px 16px; background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-light); border-radius: var(--radius-md); font-size: 13px; cursor: pointer; transition: background var(--transition-fast); }
.btn-cancel:hover { background: var(--bg-hover); }
</style>
