<template>
  <AdminLayout>
    <h2 class="ptitle">DIY 页面管理</h2>
    <div class="toolbar">
      <input v-model="keyword" class="input-search" placeholder="搜索页面标题..." @keyup.enter="fetchData" />
      <select v-model="filterStatus" class="sel" @change="fetchData">
        <option value="">全部状态</option>
        <option value="1">已发布</option><option value="0">草稿</option>
      </select>
      <button class="btn-primary" @click="openCreate">+ 新建页面</button>
    </div>
    <LoadingSkeleton v-if="loading" type="table" :rows="5" :cols="6" />
    <div class="table-wrap" v-else-if="list.length">
    <table class="table"><thead><tr><th>ID</th><th>标题</th><th>Slug</th><th>状态</th><th>更新时间</th><th>操作</th></tr></thead>
    <tbody><tr v-for="p in list" :key="p.id"><td>{{ p.id }}</td><td>{{ p.title || p.name }}</td><td><code class="slug">{{ p.slug }}</code></td><td><span :class="p.is_published ? 'badge-success' : 'badge-draft'">{{ p.is_published ? '已发布' : '草稿' }}</span></td><td>{{ p.updated_at?.slice(0,10) || '-' }}</td><td><button class="btn-sm" @click="openEdit(p)">编辑</button><button class="btn-sm" @click="toggleStatus(p)">{{ p.is_published ? '下架' : '发布' }}</button><button class="btn-sm btn-danger" @click="deleteItem(p.id)">删除</button></td></tr></tbody></table>
    </div>
    <EmptyState v-else icon="📄" title="暂无 DIY 页面" description="创建您的第一个自定义页面" action-label="新建页面" @action="openCreate" />

    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="showModal=false">
        <div class="modal">
          <h3>{{ editing ? '编辑页面' : '新建页面' }}</h3>
          <div class="form-group"><label>标题</label><input v-model="editForm.title" class="input" /></div>
          <div class="form-group"><label>Slug</label><input v-model="editForm.slug" class="input" :disabled="!!editing" /></div>
          <div class="form-group"><label>描述</label><textarea v-model="editForm.description" class="input" rows="2" /></div>
          <div class="modal-actions">
            <button class="btn-cancel" @click="showModal=false">取消</button>
            <button class="btn-save" :disabled="saving" @click="save">{{ saving?'保存中...':'保存' }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </AdminLayout>
</template>
<script setup lang="ts">

const toast = useToast()
const list = ref<any[]>([]), loading = ref(true)
const keyword = ref(''), filterStatus = ref('')
const showModal = ref(false), editing = ref<any>(null), saving = ref(false)
const editForm = reactive({ title: '', slug: '', description: '' })

onMounted(fetchData)
async function fetchData() {
  loading.value = true
  try {
    let url = '/api/diy'
    const params = new URLSearchParams()
    if (keyword.value) params.set('keyword', keyword.value)
    if (filterStatus.value !== '') params.set('status', filterStatus.value)
    const qs = params.toString()
    const data: any = await $fetch(qs ? `${url}?${qs}` : url, { credentials: 'include' })
    list.value = data?.data?.list || data?.data || []
    if (!Array.isArray(list.value)) list.value = []
  } catch(e) { toast.error('加载失败') }
  loading.value = false
}

function openCreate() { editing.value = null; editForm.title = ''; editForm.slug = ''; editForm.description = ''; showModal.value = true }
function openEdit(p: any) { editing.value = p; editForm.title = p.title || p.name || ''; editForm.slug = p.slug || ''; editForm.description = p.description || ''; showModal.value = true }

async function save() {
  saving.value = true
  try {
    const body = { ...editForm, is_published: editing.value?.is_published ?? false }
    if (editing.value) {
      await $fetch(`/api/diy/${editing.value.id}`, { method: 'PUT', credentials: 'include', body })
    } else {
      await $fetch('/api/diy', { method: 'POST', credentials: 'include', body })
    }
    showModal.value = false; fetchData()
  } catch(e: any) { toast.error(e.data?.msg || '保存失败') }
  saving.value = false
}

async function toggleStatus(p: any) {
  try {
    const body = { is_published: !p.is_published }
    await $fetch(`/api/diy/${p.id}`, { method: 'PUT', credentials: 'include', body })
    fetchData()
  } catch(e: any) { toast.error(e.data?.msg || '操作失败') }
}

async function deleteItem(id: number) {
  if (!confirm('确定删除?')) return
  try {
    await $fetch(`/api/diy/${id}`, { method: 'DELETE', credentials: 'include' })
    fetchData()
  } catch(e: any) { toast.error(e.data?.msg || '删除失败') }
}
</script>
<style scoped>
h2 { font-size: 22px; font-weight: 700; color: var(--text-primary); margin-bottom: 20px; }
.toolbar { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
.input-search { flex: 1; min-width: 160px; max-width: 280px; padding: 7px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast); }
.input-search:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.sel { padding: 7px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--bg-card); color: var(--text-primary); outline: none; }
.sel:focus { border-color: var(--input-focus-border); }
.btn-primary { padding: 7px 18px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; white-space: nowrap; transition: opacity var(--transition-fast); }
.btn-primary:hover { opacity: 0.9; }
.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; background: var(--bg-card); border-radius: var(--radius-lg); overflow: hidden; }
.table th, .table td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--table-border); }
.table th { color: var(--text-secondary); font-weight: 500; font-size: 12px; background: var(--table-header-bg); }
tr:hover td { background: var(--table-row-hover); }
.slug { font-size: 12px; color: var(--text-muted); background: var(--tag-bg); padding: 2px 6px; border-radius: var(--radius-xs); }
.badge-success { display: inline-block; padding: 2px 10px; border-radius: var(--badge-radius); font-size: var(--badge-font-size); background: var(--status-done-bg); color: var(--status-done-text); }
.badge-draft { display: inline-block; padding: 2px 10px; border-radius: var(--badge-radius); font-size: var(--badge-font-size); background: var(--bg-hover); color: var(--text-muted); }
.btn-sm { padding: 4px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-xs); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 12px; margin-right: 6px; transition: all var(--transition-fast); }
.btn-sm:hover { border-color: var(--brand); color: var(--brand); }
.btn-danger { color: var(--danger); border-color: var(--danger); }
.btn-danger:hover { background: var(--danger); color: #fff; }
.modal-overlay { position: fixed; inset: 0; background: var(--modal-overlay); z-index: 5000; display: flex; align-items: center; justify-content: center; animation: overlay-fade-in var(--transition-base); }
.modal { background: var(--bg-card); border-radius: var(--modal-radius); padding: var(--modal-padding); width: 90%; max-width: 440px; max-height: 80vh; overflow-y: auto; box-shadow: var(--modal-shadow); animation: modal-enter var(--transition-slow); }
.modal h3 { font-size: 17px; font-weight: 600; margin-bottom: 20px; color: var(--text-primary); }
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
