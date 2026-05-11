<template>
  <AdminLayout>
    <div class="page-header">
      <h1>表单管理</h1>
      <button class="btn-primary" @click="openCreate">+ 新建表单</button>
    </div>

    <div class="toolbar">
      <input v-model="keyword" type="text" placeholder="搜索标题 / 编码" @keyup.enter="search" />
      <select v-model="filterStatus" class="sel" @change="search">
        <option value="">全部状态</option>
        <option value="1">启用</option>
        <option value="0">停用</option>
      </select>
      <button class="btn" @click="search">搜索</button>
    </div>

    <LoadingSkeleton v-if="loading" type="table" :rows="5" :cols="7" />

    <div v-else-if="error" class="error-state">
      <span class="error-icon">⚠️</span>
      <p>{{ error }}</p>
      <button class="retry-btn" @click="fetchData">重试</button>
    </div>

    <template v-else-if="list.length">
      <div class="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>标题</th><th>编码</th><th>提交数/上限</th><th>有效期</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="f in list" :key="f.id">
              <td>{{ f.id }}</td><td>{{ f.title }}</td><td>{{ f.form_code }}</td>
              <td>{{ f.submit_count }}/{{ f.submit_limit || '∞' }}</td>
              <td>{{ f.start_time || '不限' }} ~ {{ f.end_time || '不限' }}</td>
              <td><span :class="f.status===1?'badge-ok':'badge-off'">{{ f.status===1?'启用':'停用' }}</span></td>
              <td class="actions">
                <button class="btn-sm" @click="showSubs(f)">提交记录</button>
                <button class="btn-sm" @click="editForm(f)">编辑</button>
                <button class="btn-sm danger" @click="delForm(f.id)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Pagination :page="page" :page-size="pageSize" :total="total" @change="onPageChange" />
    </template>
    <div v-else class="empty">暂无表单数据</div>

    <div v-if="subsOpen" class="subs-panel">
      <div class="subs-header">
        <h2>提交记录 - {{ activeFormTitle }}</h2>
        <button class="btn-cancel" @click="subsOpen = false">关闭</button>
      </div>
      <LoadingSkeleton v-if="subsLoading" type="table" :rows="3" :cols="5" />
      <template v-else-if="submissions.length">
        <table>
          <thead><tr><th>ID</th><th>数据</th><th>IP</th><th>状态</th><th>时间</th></tr></thead>
          <tbody>
            <tr v-for="s in submissions" :key="s.id">
              <td>{{ s.id }}</td>
              <td class="data-cell">{{ s.data_json }}</td>
              <td>{{ s.ip }}</td>
              <td><span :class="['badge-pending','badge-ok','badge-done'][s.status]">{{ ['待处理','已查看','已处理'][s.status] || s.status }}</span></td>
              <td>{{ s.create_time }}</td>
            </tr>
          </tbody>
        </table>
      </template>
      <div v-else class="empty-sm">暂无提交记录</div>
    </div>

    <Teleport to="body">
      <div v-if="modalOpen" class="modal-overlay" @click.self="modalOpen = false">
        <div class="modal">
          <h3>{{ isEdit ? '编辑表单' : '新建表单' }}</h3>
          <div class="form-grid">
            <label class="full">标题 <input v-model="form.title" maxlength="100" placeholder="表单标题" /></label>
            <label>编码 <input v-model="form.form_code" maxlength="50" placeholder="唯一编码" /></label>
            <label>提交上限 <input v-model.number="form.submit_limit" type="number" min="0" placeholder="0=不限" /></label>
            <label>开始时间 <input v-model="form.start_time" type="datetime-local" /></label>
            <label>结束时间 <input v-model="form.end_time" type="datetime-local" /></label>
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

const submissions = ref<any[]>([])
const subsOpen = ref(false)
const subsLoading = ref(false)
const activeFormTitle = ref('')

const toast = useToast()

onMounted(fetchData)

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams({ page: String(page.value), pageSize: String(pageSize), keyword: keyword.value })
    if (filterStatus.value) params.set('status', filterStatus.value)
    const res: any = await $fetch(`/api/forms/admin?${params.toString()}`)
    if (res?.code === 200) {
      list.value = res.data?.list || []
      total.value = res.data?.total || 0
    } else {
      list.value = res.data?.list || res.data || []
      total.value = list.value.length
    }
  } catch (e: any) {
    error.value = e?.data?.msg || e.message || '加载失败'
    toast.error(error.value)
  } finally {
    loading.value = false
  }
}

function search() { page.value = 1; fetchData() }
function onPageChange(p: number) { page.value = p; fetchData() }

function openCreate() {
  isEdit.value = false
  form.value = { title: '', form_code: '', submit_limit: 0, start_time: '', end_time: '', status: 1 }
  modalOpen.value = true
}

function editForm(f: any) {
  isEdit.value = true
  form.value = { ...f, start_time: f.start_time?.slice(0, 16) || '', end_time: f.end_time?.slice(0, 16) || '' }
  modalOpen.value = true
}

async function save() {
  saving.value = true
  try {
    const url = isEdit.value ? `/api/forms/admin/${form.value.id}` : '/api/forms/admin'
    const method = isEdit.value ? 'PUT' : 'POST'
    const res: any = await $fetch(url, { method, body: form.value })
    if (res?.code === 200 || res?.code === 0) {
      toast.success(isEdit.value ? '表单已更新' : '表单已创建')
      modalOpen.value = false
      fetchData()
    } else {
      toast.error(res?.msg || '保存失败')
    }
  } catch (e: any) {
    toast.error(e?.data?.msg || e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function showSubs(f: any) {
  activeFormTitle.value = f.title
  subsOpen.value = true
  subsLoading.value = true
  try {
    const res: any = await $fetch(`/api/forms/admin/${f.id}/submissions`)
    submissions.value = res.data?.list || []
  } catch (e: any) {
    toast.error('加载提交记录失败')
  } finally {
    subsLoading.value = false
  }
}

async function delForm(id: number) {
  if (!await confirm({ message: '确认删除该表单？此操作不可恢复。')) return
  try {
    const res: any = await $fetch(`/api/forms/admin/${id}`, { method: 'DELETE' })
    if (res?.code === 200 || res?.code === 0) {
      toast.success('表单已删除')
      fetchData()
    } else {
      toast.error(res?.msg || '删除失败')
    }
  } catch (e: any) {
    toast.error(e?.data?.msg || e.message || '删除失败')
  }
}
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
h1 { font-size: 20px; font-weight: 700; color: var(--text-primary); }
h2 { font-size: 16px; font-weight: 600; color: var(--text-primary); }
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
.data-cell { max-width: 300px; overflow: hidden; text-overflow: ellipsis; }

.badge-ok { color: var(--success); font-weight: 600; }
.badge-off { color: var(--text-muted); }
.badge-pending { color: var(--warning); font-weight: 600; }
.badge-done { color: var(--brand); font-weight: 600; }

.error-state { text-align: center; padding: 60px 20px; }
.error-icon { font-size: 48px; }
.error-state p { color: var(--text-muted); margin: 12px 0 20px; }
.retry-btn { padding: 8px 24px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: 14px; transition: opacity var(--transition-fast); }
.retry-btn:hover { opacity: 0.9; }
.empty { text-align: center; color: var(--text-muted); padding: 60px 0; }
.empty-sm { text-align: center; color: var(--text-muted); padding: 30px 0; }

.subs-panel { margin-top: 30px; background: var(--bg-card); border-radius: var(--radius-lg); padding: 20px; border: 1px solid var(--border-light); }
.subs-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }

.btn-sm { padding: 4px 10px; font-size: 12px; border: 1px solid var(--input-border); border-radius: var(--radius-xs); background: var(--bg-card); color: var(--text-primary); cursor: pointer; transition: border-color var(--transition-fast), color var(--transition-fast); }
.btn-sm:hover { border-color: var(--brand); color: var(--brand); }
.btn-sm.danger { color: var(--danger); border-color: var(--danger); }
.btn-sm.danger:hover { background: var(--danger); color: #fff; }

.modal-overlay { position: fixed; inset: 0; background: var(--modal-overlay); z-index: 5000; display: flex; align-items: center; justify-content: center; animation: overlay-fade-in var(--transition-base); }
.modal { background: var(--bg-card); border-radius: var(--modal-radius); padding: var(--modal-padding); width: 90%; max-width: 520px; max-height: 80vh; overflow-y: auto; box-shadow: var(--modal-shadow); animation: modal-enter var(--transition-slow); }
.modal h3 { font-size: 17px; font-weight: 600; margin-bottom: 20px; color: var(--text-primary); }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-grid label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: var(--text-secondary); }
.form-grid label.full { grid-column: 1 / -1; }
.form-grid input, .form-grid select { padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.form-grid input:focus, .form-grid select:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
.btn-cancel { padding: 8px 20px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 13px; transition: border-color var(--transition-fast); }
.btn-cancel:hover { border-color: var(--text-muted); }
.btn-save { padding: 8px 20px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; transition: opacity var(--transition-fast); }
.btn-save:hover { opacity: 0.9; }
.btn-save:disabled { opacity: .5; cursor: not-allowed; }
</style>
