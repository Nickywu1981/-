<template>
  <AdminLayout>
    <div class="page-header">
      <h1>DIY 页面管理</h1>
      <button class="btn-primary" @click="openCreate">+ 新建页面</button>
    </div>

    <div class="toolbar">
      <input v-model="keyword" class="input-search" placeholder="搜索标题 / 标识" @keyup.enter="search" />
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
      <div v-if="selectedIds.length > 0" class="batch-actions">
        <button class="btn-batch" @click="batchPublish">批量发布</button>
        <button class="btn-batch" @click="batchUnpublish">批量下架</button>
        <button class="btn-batch btn-danger" @click="batchDelete">批量删除</button>
      </div>
    </div>

    <LoadingSkeleton v-if="loading" type="table" :rows="5" :cols="7" />

    <div v-else-if="error" class="error-state">
      <span class="error-icon">⚠️</span>
      <p>{{ error }}</p>
      <button class="retry-btn" @click="fetchData">重试</button>
    </div>

    <div class="table-wrap" v-else-if="list.length">
      <table class="table">
        <thead>
          <tr>
            <th class="col-cb"><input type="checkbox" :checked="allSelected" @change="toggleAll" /></th>
            <th>ID</th><th>标题</th><th>Slug</th><th>类型</th><th>状态</th><th>更新时间</th><th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in list" :key="p.id">
            <td class="col-cb"><input type="checkbox" :value="p.id" v-model="selectedIds" /></td>
            <td>{{ p.id }}</td>
            <td>{{ p.title || p.name }}</td>
            <td><code class="slug">{{ p.slug }}</code></td>
            <td>{{ p.page_type || '-' }}</td>
            <td>
              <span v-if="p.is_published || p.status === 1" class="badge-success">已发布</span>
              <span v-else class="badge-draft">草稿</span>
            </td>
            <td>{{ formatDate(p.updated_at || p.update_time) }}</td>
            <td class="actions">
              <a :href="`/diy/editor?id=${p.id}`" class="btn-sm" target="_blank" rel="noopener noreferrer">编辑</a>
              <a :href="`/diy/preview?slug=${p.slug}`" class="btn-sm" target="_blank" rel="noopener noreferrer">预览</a>
              <button class="btn-sm" @click="toggleStatus(p)">{{ (p.is_published || p.status === 1) ? '下架' : '发布' }}</button>
              <button class="btn-sm btn-danger" @click="deleteItem(p.id)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <EmptyState v-else icon="📄" title="暂无 DIY 页面" description="创建您的第一个自定义页面" action-label="新建页面" @action="openCreate" />

    <Pagination v-if="total > pageSize" :page="page" :page-size="pageSize" :total="total" @change="onPageChange" />

    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
        <div class="modal">
          <h3>{{ editing ? '编辑页面' : '新建页面' }}</h3>
          <div class="form-grid">
            <label class="full">标题 <input v-model="editForm.title" class="input" placeholder="页面标题" /></label>
            <label>标识(Slug) <input v-model="editForm.slug" class="input" placeholder="my-page" :disabled="!!editing" /></label>
            <label>类型
              <select v-model="editForm.page_type" class="input" :disabled="!!editing">
                <option value="landing">落地页</option>
                <option value="detail">详情页</option>
                <option value="activity">活动页</option>
                <option value="custom">自定义</option>
              </select>
            </label>
          </div>
          <div class="form-group"><label>描述</label><textarea v-model="editForm.description" class="input" rows="2" /></div>
          <div class="modal-actions">
            <button class="btn-cancel" @click="showModal = false">取消</button>
            <button class="btn-save" :disabled="saving" @click="save">{{ saving ? '保存中...' : '保存' }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </AdminLayout>
</template>

<script setup lang="ts">
import { formatDate } from '~/utils/format'

const toast = useToast()
const list = ref<any[]>([])
const loading = ref(true)
const error = ref('')
const keyword = ref('')
const filterType = ref('')
const filterStatus = ref('')
const page = ref(1)
const pageSize = 15
const total = ref(0)
const selectedIds = ref<number[]>([])
const saving = ref(false)
const showModal = ref(false)
const editing = ref<any>(null)
const editForm = reactive({ title: '', slug: '', page_type: 'landing', description: '' })

const allSelected = computed(() => list.value.length > 0 && selectedIds.value.length === list.value.length)

function toggleAll() {
  if (allSelected.value) selectedIds.value = []
  else selectedIds.value = list.value.map(p => p.id)
}

function search() { page.value = 1; fetchData() }
function onPageChange(p: number) { page.value = p; fetchData() }

onMounted(fetchData)

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams({ page: String(page.value), pageSize: String(pageSize) })
    if (keyword.value) params.set('keyword', keyword.value)
    if (filterType.value) params.set('pageType', filterType.value)
    if (filterStatus.value !== '') params.set('status', filterStatus.value)
    const qs = params.toString()
    const data: any = await $fetch(`/api/diy?${qs}`, { credentials: 'include' })
    list.value = data?.data?.list || data?.data || []
    if (!Array.isArray(list.value)) list.value = []
    total.value = data?.data?.total || list.value.length
  } catch (e: any) {
    error.value = e.message || '加载失败'
    toast.error(error.value)
  } finally {
    loading.value = false
  }
}

function openCreate() { editing.value = null; editForm.title = ''; editForm.slug = ''; editForm.page_type = 'landing'; editForm.description = ''; showModal.value = true }
function openEdit(p: any) { editing.value = p; editForm.title = p.title || p.name || ''; editForm.slug = p.slug || ''; editForm.page_type = p.page_type || 'landing'; editForm.description = p.description || ''; showModal.value = true }

async function save() {
  saving.value = true
  try {
    if (editing.value) {
      await $fetch(`/api/diy/${editing.value.id}`, { method: 'PUT', credentials: 'include', body: editForm })
    } else {
      const res: any = await $fetch('/api/diy', { method: 'POST', credentials: 'include', body: editForm })
      if (res?.data?.id) {
        showModal.value = false; navigateTo(`/diy/editor?id=${res.data.id}`, { open: { target: '_blank' } } as any); return
      }
    }
    showModal.value = false; fetchData()
  } catch (e: any) { toast.error(e.data?.msg || '保存失败') }
  saving.value = false
}

async function toggleStatus(p: any) {
  const newStatus = (p.is_published || p.status === 1) ? 0 : 1
  try {
    await $fetch(`/api/diy/${p.id}`, { method: 'PUT', credentials: 'include', body: { is_published: !!newStatus, status: newStatus } })
    fetchData()
  } catch (e: any) { toast.error(e.data?.msg || '操作失败') }
}

async function deleteItem(id: number) {
  if (!confirm('确定删除？此操作不可恢复。')) return
  try {
    await $fetch(`/api/diy/${id}`, { method: 'DELETE', credentials: 'include' })
    selectedIds.value = selectedIds.value.filter(i => i !== id)
    fetchData()
  } catch (e: any) { toast.error(e.data?.msg || '删除失败') }
}

async function batchPublish() {
  if (!selectedIds.value.length) return
  try {
    await $fetch('/api/diy/batch/publish', { method: 'POST', credentials: 'include', body: { ids: selectedIds.value } })
    toast.success(`已发布 ${selectedIds.value.length} 个页面`)
    selectedIds.value = []; fetchData()
  } catch (e: any) { toast.error(e.data?.msg || '批量发布失败') }
}

async function batchUnpublish() {
  if (!selectedIds.value.length) return
  try {
    await $fetch('/api/diy/batch/unpublish', { method: 'POST', credentials: 'include', body: { ids: selectedIds.value } })
    toast.success(`已下架 ${selectedIds.value.length} 个页面`)
    selectedIds.value = []; fetchData()
  } catch (e: any) { toast.error(e.data?.msg || '批量下架失败') }
}

async function batchDelete() {
  if (!selectedIds.value.length) return
  if (!confirm(`确认删除 ${selectedIds.value.length} 个页面？此操作不可恢复。`)) return
  try {
    await $fetch('/api/diy/batch/delete', { method: 'POST', credentials: 'include', body: { ids: selectedIds.value } })
    toast.success(`已删除 ${selectedIds.value.length} 个页面`)
    selectedIds.value = []; fetchData()
  } catch (e: any) { toast.error(e.data?.msg || '批量删除失败') }
}
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
h1 { font-size: 20px; font-weight: 700; color: var(--text-primary); }
.btn-primary { padding: 8px 20px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: 13px; transition: opacity var(--transition-fast); }
.btn-primary:hover { opacity: 0.9; }

.toolbar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
.input-search { flex: 1; min-width: 160px; max-width: 280px; padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast); }
.input-search:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.sel { padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--bg-card); color: var(--text-primary); outline: none; }
.sel:focus { border-color: var(--input-focus-border); }

.batch-actions { display: flex; gap: 6px; align-items: center; margin-left: auto; }
.btn-batch { padding: 6px 14px; border: 1px solid var(--brand); border-radius: var(--radius-sm); background: var(--brand-light); color: var(--brand); cursor: pointer; font-size: 12px; transition: all var(--transition-fast); }
.btn-batch:hover { background: var(--brand); color: #fff; }
.btn-batch.btn-danger { border-color: var(--danger); background: var(--danger-light, #fef2f2); color: var(--danger); }
.btn-batch.btn-danger:hover { background: var(--danger); color: #fff; }

.error-state { text-align: center; padding: 60px 20px; }
.error-icon { font-size: 48px; }
.error-state p { color: var(--text-muted); margin: 12px 0 20px; }
.retry-btn { padding: 8px 24px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: 14px; }

.table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.table { width: 100%; border-collapse: collapse; background: var(--bg-card); border-radius: var(--radius-lg); overflow: hidden; white-space: nowrap; font-size: 13px; }
.table th, .table td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--table-border); }
.table th { color: var(--text-secondary); font-weight: 500; font-size: 12px; background: var(--table-header-bg); }
tr:hover td { background: var(--table-row-hover); }
.col-cb { width: 36px; text-align: center; }
.slug { font-size: 12px; color: var(--text-muted); background: var(--tag-bg); padding: 2px 6px; border-radius: var(--radius-xs); }
.badge-success { display: inline-block; padding: 2px 10px; border-radius: var(--badge-radius); font-size: var(--badge-font-size); background: var(--status-done-bg); color: var(--status-done-text); }
.badge-draft { display: inline-block; padding: 2px 10px; border-radius: var(--badge-radius); font-size: var(--badge-font-size); background: var(--bg-hover); color: var(--text-muted); }
.actions { display: flex; gap: 4px; }
.btn-sm { padding: 4px 10px; border: 1px solid var(--input-border); border-radius: var(--radius-xs); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 12px; text-decoration: none; display: inline-block; transition: all var(--transition-fast); }
.btn-sm:hover { border-color: var(--brand); color: var(--brand); }
.btn-danger { color: var(--danger); border-color: var(--danger); }
.btn-danger:hover { background: var(--danger); color: #fff; }

.modal-overlay { position: fixed; inset: 0; background: var(--modal-overlay); z-index: 5000; display: flex; align-items: center; justify-content: center; animation: overlay-fade-in var(--transition-base); }
.modal { background: var(--bg-card); border-radius: var(--modal-radius); padding: var(--modal-padding); width: 90%; max-width: 480px; max-height: 80vh; overflow-y: auto; box-shadow: var(--modal-shadow); animation: modal-enter var(--transition-slow); }
.modal h3 { font-size: 17px; font-weight: 600; margin-bottom: 20px; color: var(--text-primary); }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
.form-grid label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: var(--text-secondary); }
.form-grid label.full { grid-column: 1 / -1; }
.form-group { margin-bottom: 14px; }
.form-group label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: var(--text-secondary); }
.input { padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; width: 100%; transition: border-color var(--transition-fast); resize: vertical; }
.input:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.input:disabled { opacity: 0.6; cursor: not-allowed; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
.btn-cancel { padding: 8px 20px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 13px; }
.btn-cancel:hover { border-color: var(--text-muted); }
.btn-save { padding: 8px 20px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; }
.btn-save:hover { opacity: 0.9; }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
