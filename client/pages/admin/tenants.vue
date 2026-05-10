<template>
  <AdminLayout>
    <div class="page-header">
      <h1>租户管理</h1>
      <button class="btn-primary" @click="openCreate">+ 新建租户</button>
    </div>

    <div class="toolbar">
      <input v-model="keyword" type="text" placeholder="搜索名称 / 编码" @keyup.enter="search" />
      <select v-model="filterStatus" class="sel" @change="search">
        <option value="">全部状态</option>
        <option value="1">启用</option>
        <option value="0">停用</option>
      </select>
      <button class="btn" @click="search">搜索</button>
    </div>

    <LoadingSkeleton v-if="loading" type="table" :rows="5" :cols="9" />

    <div v-else-if="error" class="error-state">
      <span class="error-icon">⚠️</span>
      <p>{{ error }}</p>
      <button class="retry-btn" @click="fetchData">重试</button>
    </div>

    <template v-else-if="list.length">
      <div class="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>名称</th><th>编码</th><th>套餐</th><th>用量(图/视频)</th><th>人数</th><th>到期时间</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="t in list" :key="t.id">
              <td>{{ t.id }}</td><td>{{ t.name }}</td><td>{{ t.code }}</td>
              <td>{{ t.plan_type }}</td><td>{{ t.quota_images }}/{{ t.quota_video }}</td>
              <td>{{ t.max_users }}</td><td>{{ t.expire_time || '无限制' }}</td>
              <td><span :class="t.status===1?'badge-ok':'badge-off'">{{ t.status===1?'启用':'停用' }}</span></td>
              <td class="actions">
                <button class="btn-sm" @click="openEdit(t)">编辑</button>
                <button class="btn-sm" :class="t.status===1?'danger':''" @click="toggleStatus(t)">{{ t.status===1?'停用':'启用' }}</button>
                <button class="btn-sm danger" @click="delTenant(t.id)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Pagination :page="page" :page-size="pageSize" :total="total" @change="onPageChange" />
    </template>
    <div v-else class="empty">暂无租户数据</div>

    <Teleport to="body">
      <div v-if="modalOpen" class="modal-overlay" @click.self="modalOpen = false">
        <div class="modal">
          <h3>{{ isEdit ? '编辑租户' : '新建租户' }}</h3>
          <div class="form-grid">
            <label>名称 <input v-model="form.name" placeholder="公司/组织名称" /></label>
            <label>编码 <input v-model="form.code" placeholder="唯一标识" /></label>
            <label>套餐
              <select v-model="form.plan_type">
                <option value="free">免费版</option>
                <option value="pro">专业版</option>
                <option value="enterprise">企业版</option>
              </select>
            </label>
            <label>图片配额 <input v-model.number="form.quota_images" type="number" /></label>
            <label>视频配额 <input v-model.number="form.quota_video" type="number" /></label>
            <label>最大人数 <input v-model.number="form.max_users" type="number" /></label>
            <label>到期时间 <input v-model="form.expire_time" type="date" /></label>
            <label>状态
              <select v-model="form.status">
                <option :value="1">启用</option>
                <option :value="0">停用</option>
              </select>
            </label>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" @click="modalOpen = false">取消</button>
            <button class="btn-save" :disabled="saving" @click="save">{{ saving ? '保存中...' : '保存' }}</button>
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
const pageSize = 15
const keyword = ref('')
const filterStatus = ref('')
const loading = ref(true)
const error = ref('')
const saving = ref(false)
const modalOpen = ref(false)
const isEdit = ref(false)
const form = ref<any>({})

const toast = useToast()

onMounted(fetchData)

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams({ page: String(page.value), pageSize: String(pageSize), keyword: keyword.value })
    if (filterStatus.value !== '') params.set('status', filterStatus.value)
    const res: any = await $fetch(`/api/tenants?${params.toString()}`)
    if (res?.code === 200) {
      list.value = res.data?.list || []
      total.value = res.data?.total || 0
    } else {
      list.value = res.data || []
      total.value = list.value.length
    }
  } catch (e: any) {
    error.value = e.message || '加载失败'
    toast.error(error.value)
  } finally {
    loading.value = false
  }
}

function search() { page.value = 1; fetchData() }
function onPageChange(p: number) { page.value = p; fetchData() }

function openCreate() {
  isEdit.value = false
  form.value = { name: '', code: '', plan_type: 'free', quota_images: 100, quota_video: 10, max_users: 5, expire_time: '', status: 1 }
  modalOpen.value = true
}

function openEdit(t: any) {
  isEdit.value = true
  form.value = { ...t, expire_time: t.expire_time?.slice(0, 10) || '' }
  modalOpen.value = true
}

async function save() {
  saving.value = true
  try {
    const url = isEdit.value ? `/api/tenants/${form.value.id}` : '/api/tenants'
    const method = isEdit.value ? 'PUT' : 'POST'
    const res: any = await $fetch(url, { method, body: form.value })
    if (res?.code === 200 || res?.code === 0) {
      toast.success(isEdit.value ? '租户已更新' : '租户已创建')
      modalOpen.value = false
      fetchData()
    } else {
      toast.error(res?.msg || '保存失败')
    }
  } catch (e: any) {
    toast.error(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function toggleStatus(t: any) {
  const newStatus = t.status === 1 ? 0 : 1
  try {
    const res: any = await $fetch(`/api/tenants/${t.id}`, { method: 'PUT', body: { status: newStatus } })
    if (res?.code === 200 || res?.code === 0) {
      t.status = newStatus
      toast.success(newStatus === 1 ? '已启用' : '已停用')
    } else {
      toast.error(res?.msg || '操作失败')
    }
  } catch (e: any) {
    toast.error(e.message || '操作失败')
  }
}

async function delTenant(id: number) {
  if (!await confirm({ message: '确认删除该租户？此操作不可恢复。' })) return
  try {
    const res: any = await $fetch(`/api/tenants/${id}`, { method: 'DELETE' })
    if (res?.code === 200 || res?.code === 0) {
      toast.success('租户已删除')
      fetchData()
    } else {
      toast.error(res?.msg || '删除失败')
    }
  } catch (e: any) {
    toast.error(e.message || '删除失败')
  }
}
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
h1 { font-size: 20px; font-weight: 700; color: var(--text-primary); }
.btn-primary { padding: 8px 20px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: 13px; transition: opacity var(--transition-fast); }
.btn-primary:hover { opacity: 0.9; }

.toolbar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.toolbar input { flex: 1; min-width: 160px; max-width: 280px; padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--bg-input); color: var(--text-primary); transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.toolbar input:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.sel { padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--bg-card); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast); }
.sel:focus { border-color: var(--input-focus-border); }
.btn { padding: 8px 16px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; transition: opacity var(--transition-fast); }
.btn:hover { opacity: 0.9; }

.table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
table { width: 100%; border-collapse: collapse; background: var(--bg-card); border-radius: var(--radius-lg); overflow: hidden; white-space: nowrap; }
th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--table-border); font-size: 13px; }
th { background: var(--table-header-bg); font-weight: 600; color: var(--text-secondary); }
tr:hover td { background: var(--table-row-hover); }
.actions { display: flex; gap: 6px; }

.badge-ok { color: var(--success); font-weight: 600; }
.badge-off { color: var(--text-muted); }

.error-state { text-align: center; padding: 60px 20px; }
.error-icon { font-size: 48px; }
.error-state p { color: var(--text-muted); margin: 12px 0 20px; }
.retry-btn { padding: 8px 24px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: 14px; transition: opacity var(--transition-fast); }
.retry-btn:hover { opacity: 0.9; }
.empty { text-align: center; color: var(--text-muted); padding: 60px 0; }

.btn-sm { padding: 4px 10px; font-size: 12px; border: 1px solid var(--input-border); border-radius: var(--radius-xs); background: var(--bg-card); color: var(--text-primary); cursor: pointer; transition: all var(--transition-fast); }
.btn-sm:hover { border-color: var(--brand); color: var(--brand); }
.btn-sm.danger { color: var(--danger); border-color: var(--danger); }
.btn-sm.danger:hover { background: var(--danger); color: #fff; }

.modal-overlay { position: fixed; inset: 0; background: var(--modal-overlay); z-index: 5000; display: flex; align-items: center; justify-content: center; animation: overlay-fade-in var(--transition-base); }
.modal { background: var(--bg-card); border-radius: var(--modal-radius); padding: var(--modal-padding); width: 90%; max-width: 520px; max-height: 80vh; overflow-y: auto; box-shadow: var(--modal-shadow); animation: modal-enter var(--transition-slow); }
.modal h3 { font-size: 17px; font-weight: 600; margin-bottom: 20px; color: var(--text-primary); }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-grid label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: var(--text-secondary); }
.form-grid input, .form-grid select { padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.form-grid input:focus, .form-grid select:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
.btn-cancel { padding: 8px 20px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 13px; transition: all var(--transition-fast); }
.btn-cancel:hover { border-color: var(--text-muted); }
.btn-save { padding: 8px 20px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; transition: opacity var(--transition-fast); }
.btn-save:hover { opacity: 0.9; }
.btn-save:disabled { opacity: .5; cursor: not-allowed; }

@media (max-width: 640px) {
  .form-grid { grid-template-columns: 1fr; }
}
</style>
