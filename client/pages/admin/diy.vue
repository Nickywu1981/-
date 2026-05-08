<template>
  <AdminLayout>
    <div class="page-header">
      <h1>DIY页面管理</h1>
      <button class="btn-primary" @click="openCreate">+ 新建页面</button>
    </div>

    <div class="toolbar">
      <input v-model="keyword" type="text" placeholder="搜索标题 / 标识" @keyup.enter="search" />
      <select v-model="filterType" class="sel" @change="search">
        <option value="">全部类型</option>
        <option value="landing">落地页</option>
        <option value="detail">详情页</option>
        <option value="activity">活动页</option>
        <option value="custom">自定义</option>
      </select>
      <select v-model="filterStatus" class="sel" @change="search">
        <option value="">全部状态</option>
        <option value="1">已发布</option>
        <option value="0">草稿</option>
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
          <thead><tr><th>ID</th><th>标题</th><th>标识</th><th>类型</th><th>状态</th><th>更新时间</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="p in list" :key="p.id">
              <td>{{ p.id }}</td><td>{{ p.title }}</td><td>/diy/{{ p.slug }}</td>
              <td>{{ p.page_type }}</td>
              <td><span :class="p.status===1?'badge-ok':'badge-draft'">{{ p.status===1?'已发布':'草稿' }}</span></td>
              <td>{{ p.update_time }}</td>
              <td class="actions">
                <a :href="`/diy/editor?id=${p.id}`" class="btn-sm" target="_blank">编辑</a>
                <a :href="`/diy/preview?slug=${p.slug}`" class="btn-sm" target="_blank">预览</a>
                <button class="btn-sm" @click="togglePublish(p)">{{ p.status===1?'下架':'发布' }}</button>
                <button class="btn-sm danger" @click="delPage(p.id)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Pagination :page="page" :page-size="pageSize" :total="total" @change="onPageChange" />
    </template>
    <div v-else class="empty">暂无DIY页面</div>

    <Teleport to="body">
      <div v-if="modalOpen" class="modal-overlay" @click.self="modalOpen = false">
        <div class="modal">
          <h3>新建页面</h3>
          <div class="form-grid">
            <label class="full">标题 <input v-model="form.title" placeholder="页面标题" /></label>
            <label>标识(Slug) <input v-model="form.slug" placeholder="my-page" /></label>
            <label>类型
              <select v-model="form.page_type">
                <option value="landing">落地页</option>
                <option value="detail">详情页</option>
                <option value="activity">活动页</option>
                <option value="custom">自定义</option>
              </select>
            </label>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" @click="modalOpen = false">取消</button>
            <button class="btn-save" :disabled="saving" @click="save">{{ saving ? '创建中...' : '创建并编辑' }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </AdminLayout>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 15
const keyword = ref('')
const filterType = ref('')
const filterStatus = ref('')
const loading = ref(true)
const error = ref('')
const saving = ref(false)
const modalOpen = ref(false)
const form = ref({ title: '', slug: '', page_type: 'landing' })

const toast = useToast()

onMounted(fetchData)

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams({ page: String(page.value), pageSize: String(pageSize), keyword: keyword.value })
    if (filterType.value) params.set('pageType', filterType.value)
    if (filterStatus.value) params.set('status', filterStatus.value)
    const res: any = await $fetch(`/api/diy?${params.toString()}`)
    if (res?.code === 200) {
      list.value = res.data?.list || []
      total.value = res.data?.total || 0
    } else {
      list.value = res.data?.list || res.data || []
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
  form.value = { title: '', slug: '', page_type: 'landing' }
  modalOpen.value = true
}

async function save() {
  saving.value = true
  try {
    const res: any = await $fetch('/api/diy', { method: 'POST', body: form.value })
    if (res?.code === 200 || res?.code === 0) {
      toast.success('页面已创建')
      modalOpen.value = false
      if (res.data?.id) navigateTo(`/diy/editor?id=${res.data.id}`, { open: { target: '_blank' } } as any)
      fetchData()
    } else {
      toast.error(res?.msg || '创建失败')
    }
  } catch (e: any) {
    toast.error(e.message || '创建失败')
  } finally {
    saving.value = false
  }
}

async function togglePublish(p: any) {
  const newStatus = p.status === 1 ? 0 : 1
  try {
    const res: any = await $fetch(`/api/diy/${p.id}`, { method: 'PUT', body: { status: newStatus } })
    if (res?.code === 200 || res?.code === 0) {
      p.status = newStatus
      toast.success(newStatus === 1 ? '已发布' : '已下架')
    } else {
      toast.error(res?.msg || '操作失败')
    }
  } catch (e: any) {
    toast.error(e.message || '操作失败')
  }
}

async function delPage(id: number) {
  if (!confirm('确认删除该页面？此操作不可恢复。')) return
  try {
    const res: any = await $fetch(`/api/diy/${id}`, { method: 'DELETE' })
    if (res?.code === 200 || res?.code === 0) {
      toast.success('页面已删除')
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
.badge-draft { color: var(--warning); font-weight: 600; }

.error-state { text-align: center; padding: 60px 20px; }
.error-icon { font-size: 48px; }
.error-state p { color: var(--text-muted); margin: 12px 0 20px; }
.retry-btn { padding: 8px 24px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: 14px; transition: opacity var(--transition-fast); }
.retry-btn:hover { opacity: 0.9; }
.empty { text-align: center; color: var(--text-muted); padding: 60px 0; }

.btn-sm { padding: 4px 10px; font-size: 12px; border: 1px solid var(--input-border); border-radius: var(--radius-xs); background: var(--bg-card); color: var(--text-primary); cursor: pointer; text-decoration: none; transition: all var(--transition-fast); display: inline-block; }
.btn-sm:hover { border-color: var(--brand); color: var(--brand); }
.btn-sm.danger { color: var(--danger); border-color: var(--danger); }
.btn-sm.danger:hover { background: var(--danger); color: #fff; }

.modal-overlay { position: fixed; inset: 0; background: var(--modal-overlay); z-index: 5000; display: flex; align-items: center; justify-content: center; animation: overlay-fade-in var(--transition-base); }
.modal { background: var(--bg-card); border-radius: var(--modal-radius); padding: var(--modal-padding); width: 90%; max-width: 480px; max-height: 80vh; overflow-y: auto; box-shadow: var(--modal-shadow); animation: modal-enter var(--transition-slow); }
.modal h3 { font-size: 17px; font-weight: 600; margin-bottom: 20px; color: var(--text-primary); }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-grid label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: var(--text-secondary); }
.form-grid label.full { grid-column: 1 / -1; }
.form-grid input, .form-grid select { padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.form-grid input:focus, .form-grid select:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
.btn-cancel { padding: 8px 20px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 13px; transition: all var(--transition-fast); }
.btn-cancel:hover { border-color: var(--text-muted); }
.btn-save { padding: 8px 20px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; transition: opacity var(--transition-fast); }
.btn-save:hover { opacity: 0.9; }
.btn-save:disabled { opacity: .5; cursor: not-allowed; }
</style>
