<template>
  <AdminLayout>
    <div class="page-header">
      <h2>用户管理</h2>
      <div class="header-actions">
        <button class="btn-outline" @click="exportCSV">📥 导出</button>
      </div>
    </div>

    <div class="toolbar">
      <input v-model="keyword" type="text" placeholder="搜索用户名 / 昵称 / 手机号" @keyup.enter="search" />
      <select v-model="filterStatus" class="sel" @change="search">
        <option value="">全部状态</option>
        <option value="0">正常</option>
        <option value="1">禁用</option>
      </select>
      <select v-model="filterPlan" class="sel" @change="search">
        <option value="">全部会员</option>
        <option value="0">免费</option><option value="1">月卡</option><option value="2">季卡</option><option value="3">年卡</option>
      </select>
      <button class="btn" @click="search">搜索</button>
      <button v-if="selectedIds.size" class="btn-danger" @click="batchToggleStatus(1)">批量禁用 ({{ selectedIds.size }})</button>
      <button v-if="selectedIds.size" class="btn-outline" @click="batchToggleStatus(0)">批量启用 ({{ selectedIds.size }})</button>
    </div>

    <LoadingSkeleton v-if="loading" type="table" :rows="8" :cols="9" />

    <div v-else-if="error" class="error-state">
      <span class="error-icon">⚠️</span>
      <p>{{ error }}</p>
      <button class="retry-btn" @click="fetchData">重试</button>
    </div>

    <template v-else-if="list.length">
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th class="cb-col"><input type="checkbox" :checked="allSelected" @change="toggleAll" /></th>
              <th>ID</th><th>用户名</th><th>昵称</th><th>手机号</th><th>会员</th><th>余额</th><th>状态</th><th>注册时间</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in list" :key="u.id" :class="{ selected: selectedIds.has(u.id) }">
              <td class="cb-col"><input type="checkbox" :checked="selectedIds.has(u.id)" @change="toggleOne(u.id)" /></td>
              <td>{{ u.id }}</td>
              <td>{{ u.username }}</td>
              <td>{{ u.nickname }}</td>
              <td>{{ u.phone || '-' }}</td>
              <td>{{ u.plan_type > 0 ? ['', '月卡', '季卡', '年卡'][u.plan_type] : '免费' }}</td>
              <td>{{ u.credit_balance ?? 0 }}</td>
              <td><span class="status" :class="u.status === 0 ? 'active' : 'banned'">{{ u.status === 0 ? '正常' : '禁用' }}</span></td>
              <td>{{ u.create_time?.slice(0, 10) }}</td>
              <td class="actions">
                <button class="btn-sm" @click="openEdit(u)">编辑</button>
                <button v-if="u.status === 0" class="btn-sm danger" @click="toggleStatus(u, 1)">禁用</button>
                <button v-else class="btn-sm" @click="toggleStatus(u, 0)">启用</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Pagination :page="page" :page-size="pageSize" :total="total" @change="onPageChange" />
    </template>
    <div v-else class="empty">暂无数据</div>

    <Teleport to="body">
      <div v-if="editOpen" class="modal-overlay" @click.self="editOpen = false">
        <div class="modal">
          <h3>编辑用户 #{{ editForm.id }}</h3>
          <div class="form-grid">
            <label>用户名 <input v-model="editForm.username" maxlength="100" /></label>
            <label>昵称 <input v-model="editForm.nickname" maxlength="100" /></label>
            <label>手机号 <input v-model="editForm.phone" maxlength="20" /></label>
            <label>会员类型
              <select v-model="editForm.plan_type">
                <option :value="0">免费</option><option :value="1">月卡</option><option :value="2">季卡</option><option :value="3">年卡</option>
              </select>
            </label>
            <label>余额 <input v-model.number="editForm.credit_balance" type="number" min="0" /></label>
            <label>状态
              <select v-model="editForm.status"><option :value="0">正常</option><option :value="1">禁用</option></select>
            </label>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" @click="editOpen = false">取消</button>
            <button class="btn-save" :disabled="saving" @click="saveEdit">{{ saving ? '保存中...' : '保存' }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </AdminLayout>
</template>

<script setup lang="ts">

const { confirm } = useConfirm()
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const keyword = ref('')
const filterStatus = ref('')
const filterPlan = ref('')
const loading = ref(true)
const error = ref('')
const saving = ref(false)
const selectedIds = ref(new Set<number>())
const editOpen = ref(false)
const editForm = ref<any>({})
const { downloadBlob } = useFileDownload()

const toast = useToast()

const allSelected = computed(() => list.value.length > 0 && list.value.every(u => selectedIds.value.has(u.id)))

onMounted(fetchData)

async function fetchData() {
  loading.value = true; error.value = ''
  try {
    const params = new URLSearchParams({ page: String(page.value), pageSize: String(pageSize), keyword: keyword.value })
    if (filterStatus.value !== '') params.set('status', filterStatus.value)
    if (filterPlan.value !== '') params.set('planType', filterPlan.value)

    const data = await $fetch(`/api/admin/users?${params.toString()}`, { credentials: 'include' })
    const res = data as any
    if (res?.code === 200) { list.value = res.data.list || []; total.value = res.data.total || 0 }
    else { throw new Error(res?.msg || '获取用户列表失败') }
  } catch (e: any) { error.value = e?.data?.msg || e.message || '加载失败'; toast.error(error.value) } finally { loading.value = false }
}

function search() { page.value = 1; selectedIds.value = new Set(); fetchData() }
function onPageChange(p: number) { page.value = p; selectedIds.value = new Set(); fetchData() }

function toggleOne(id: number) {
  const s = new Set(selectedIds.value)
  s.has(id) ? s.delete(id) : s.add(id)
  selectedIds.value = s
}
function toggleAll() {
  if (allSelected.value) { selectedIds.value = new Set() }
  else { selectedIds.value = new Set(list.value.map(u => u.id)) }
}

async function toggleStatus(user: any, status: number) {
  if (!await confirm({ message: status === 1 ? `确认禁用用户「${user.username}」？` : `确认启用用户「${user.username}」？` })) return
  try {
    const data = await $fetch(`/api/admin/users/${user.id}/status`, { method: 'PUT', credentials: 'include', body: { status } })
    const res = data as any
    if (res?.code === 200) { user.status = status; toast.success(status === 1 ? `已禁用 ${user.username}` : `已启用 ${user.username}`) }
    else { toast.error(res?.msg || '操作失败') }
  } catch (e: any) { toast.error(e?.data?.msg || e.message || '操作失败') }
}

async function batchToggleStatus(status: number) {
  const label = status === 1 ? '禁用' : '启用'
  if (!await confirm({ message: `确认批量${label} ${selectedIds.value.size} 个用户？` })) return
  try {
    const ids = [...selectedIds.value]
    const data = await $fetch('/api/admin/users/batch-status', { method: 'PUT', credentials: 'include', body: { ids, status } })
    const res = data as any
    if (res?.code === 200) { toast.success(`已批量${label} ${ids.length} 个用户`); selectedIds.value = new Set(); fetchData() }
    else { toast.error(res?.msg || '操作失败') }
  } catch (e: any) { toast.error(e?.data?.msg || e.message || '操作失败') }
}

function openEdit(u: any) { editForm.value = { ...u }; editOpen.value = true }

async function saveEdit() {
  saving.value = true
  try {
    const data = await $fetch(`/api/admin/users/${editForm.value.id}`, { method: 'PUT', credentials: 'include', body: editForm.value })
    const res = data as any
    if (res?.code === 200) { toast.success('用户信息已更新'); editOpen.value = false; fetchData() }
    else { toast.error(res?.msg || '保存失败') }
  } catch (e: any) { toast.error(e?.data?.msg || e.message || '保存失败') } finally { saving.value = false }
}

function exportCSV() {
  const headers = ['ID', '用户名', '昵称', '手机号', '会员', '余额', '状态', '注册时间']
  const rows = list.value.map(u => [
    u.id, u.username, u.nickname, u.phone || '',
    u.plan_type > 0 ? ['', '月卡', '季卡', '年卡'][u.plan_type] : '免费',
    u.credit_balance ?? 0, u.status === 0 ? '正常' : '禁用',
    u.create_time?.slice(0, 10) || '',
  ])
  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, `用户列表_${new Date().toISOString().slice(0, 10)}.csv`)
  toast.success('导出成功')
}
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
h2 { font-size: 22px; font-weight: 700; color: var(--text-primary); }
.header-actions { display: flex; gap: 8px; }

.toolbar { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
.toolbar input { flex: 1; min-width: 160px; max-width: 320px; padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--bg-input); color: var(--text-primary); transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.toolbar input:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.sel { padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--bg-card); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast); }
.sel:focus { border-color: var(--input-focus-border); }
.btn { padding: 8px 20px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; white-space: nowrap; transition: opacity var(--transition-fast); }
.btn:hover { opacity: 0.9; }
.btn-outline { padding: 8px 20px; background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--input-border); border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; white-space: nowrap; transition: border-color var(--transition-fast), color var(--transition-fast); }
.btn-outline:hover { border-color: var(--brand); color: var(--brand); }
.btn-danger { padding: 8px 20px; background: var(--danger); color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; white-space: nowrap; transition: opacity var(--transition-fast); }
.btn-danger:hover { opacity: 0.9; }

.table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; background: var(--bg-card); border-radius: var(--radius-lg); overflow: hidden; white-space: nowrap; }
.table th, .table td { text-align: left; padding: 10px; border-bottom: 1px solid var(--table-border); }
.table th { color: var(--text-secondary); font-weight: 500; font-size: 12px; background: var(--table-header-bg); }
tr:hover td { background: var(--table-row-hover); }
tr.selected { background: var(--brand-light); }
.cb-col { width: 40px; text-align: center; }
.actions { display: flex; gap: 6px; }

.error-state { text-align: center; padding: 60px 20px; }
.error-icon { font-size: 48px; }
.error-state p { color: var(--text-muted); margin: 12px 0 20px; font-size: 14px; }
.retry-btn { padding: 8px 24px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: 14px; transition: opacity var(--transition-fast); }
.retry-btn:hover { opacity: 0.9; }

.status { padding: 2px 8px; border-radius: var(--radius-xs); font-size: 12px; }
.status.active { background: var(--status-done-bg); color: var(--status-done-text); }
.status.banned { background: var(--status-fail-bg); color: var(--status-fail-text); }
.btn-sm { padding: 4px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-xs); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 12px; transition: border-color var(--transition-fast), color var(--transition-fast); }
.btn-sm:hover { border-color: var(--brand); color: var(--brand); }
.btn-sm.danger { color: var(--danger); border-color: var(--danger); }
.btn-sm.danger:hover { background: var(--danger); color: #fff; }
.empty { text-align: center; color: var(--text-muted); padding: 60px 0; }

.modal-overlay { position: fixed; inset: 0; background: var(--modal-overlay); z-index: 5000; display: flex; align-items: center; justify-content: center; animation: overlay-fade-in var(--transition-base); }
.modal { background: var(--bg-card); border-radius: var(--modal-radius); padding: var(--modal-padding); width: 90%; max-width: 520px; max-height: 80vh; overflow-y: auto; box-shadow: var(--modal-shadow); animation: modal-enter var(--transition-slow); }
.modal h3 { font-size: 17px; font-weight: 600; margin-bottom: 20px; color: var(--text-primary); }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-grid label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: var(--text-secondary); }
.form-grid input, .form-grid select { padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.form-grid input:focus, .form-grid select:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
.btn-cancel { padding: 8px 20px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 13px; transition: border-color var(--transition-fast); }
.btn-cancel:hover { border-color: var(--text-muted); }
.btn-save { padding: 8px 20px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; transition: opacity var(--transition-fast); }
.btn-save:hover { opacity: 0.9; }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

@media (max-width: 640px) {
  h2 { font-size: 18px; }
  .toolbar input { max-width: 100%; }
  .form-grid { grid-template-columns: 1fr; }
}
</style>
