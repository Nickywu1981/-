<template>
  <AdminLayout>
    <h2 class="ptitle">表单模板管理</h2>
    <div class="toolbar">
      <select v-model="filterType" class="sel" @change="fetchData">
        <option value="">全部类型</option>
        <option value="feedback">用户反馈</option><option value="survey">问卷调查</option><option value="contact">联系我们</option>
      </select>
      <button class="btn btn-primary" @click="openCreate">+ 新建表单</button>
    </div>
    <LoadingSkeleton v-if="loading" type="table" :rows="5" :cols="7" />
    <div class="table-wrap" v-else-if="list.length">
    <table class="table"><thead><tr><th>ID</th><th>名称</th><th>编码</th><th>状态</th><th>创建时间</th><th>操作</th></tr></thead>
    <tbody><tr v-for="f in list" :key="f.id"><td>{{ f.id }}</td><td>{{ f.name || f.title }}</td><td><code>{{ f.code }}</code></td><td><span :class="f.status===1?'badge-success':'badge-danger'">{{ f.status===1?'启用':'停用' }}</span></td><td>{{ f.created_at?.slice(0,10) }}</td><td><button class="btn-sm" @click="openEdit(f)">编辑</button><button class="btn-sm btn-danger" @click="deleteItem(f.id)">删除</button></td></tr></tbody></table>
    </div>
    <EmptyState v-else icon="📝" title="暂无表单模板" description="创建第一个自定义表单" action-label="新建表单" @action="openCreate" />

    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="showModal=false">
        <div class="modal">
          <h3>{{ editing ? '编辑表单' : '新建表单' }}</h3>
          <div class="form-group"><label>名称</label><input v-model="editForm.name" class="input" /></div>
          <div class="form-group"><label>编码</label><input v-model="editForm.code" class="input" :disabled="!!editing" /></div>
          <div class="form-group"><label>描述</label><textarea v-model="editForm.description" class="input" rows="2" /></div>
          <div class="modal-actions">
            <button class="btn-cancel" @click="showModal=false">取消</button>
            <button class="btn-save" :disabled="saving" @click="saveForm">{{ saving?'保存中...':'保存' }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </AdminLayout>
</template>
<script setup lang="ts">

const toast = useToast()
const list = ref<any[]>([]), loading = ref(true), filterType = ref('')
const showModal = ref(false), editing = ref<any>(null), saving = ref(false)
const editForm = reactive({ name: '', code: '', description: '' })

async function fetchData() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (filterType.value) params.set('type', filterType.value)
    const data: any = await $fetch(`/api/forms/admin?${params}`, { credentials: 'include' })
    list.value = data?.data?.list || data?.data || []
  } catch(e) { toast.error('加载失败') }
  loading.value = false
}

function openCreate() {
  editing.value = null
  editForm.name = ''; editForm.code = ''; editForm.description = ''
  showModal.value = true
}
function openEdit(f: any) {
  editing.value = f
  editForm.name = f.name || f.title || ''
  editForm.code = f.code || ''
  editForm.description = f.description || ''
  showModal.value = true
}
async function saveForm() {
  saving.value = true
  try {
    if (editing.value) {
      await $fetch(`/api/forms/admin/${editing.value.id}`, { method: 'PUT', body: editForm, credentials: 'include' })
    } else {
      await $fetch('/api/forms/admin', { method: 'POST', body: editForm, credentials: 'include' })
    }
    showModal.value = false
    fetchData()
  } catch(e: any) { toast.error(e.data?.msg || '保存失败') }
  saving.value = false
}
async function deleteItem(id: number) {
  if (!confirm('确定删除?')) return
  try {
    await $fetch(`/api/forms/admin/${id}`, { method: 'DELETE', credentials: 'include' })
    fetchData()
  } catch(e: any) { toast.error(e.data?.msg || '删除失败') }
}
onMounted(fetchData)
</script>
<style scoped>
h2 { font-size: 22px; font-weight: 700; color: var(--text-primary); margin-bottom: 20px; }

.toolbar { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
.sel { padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--bg-card); color: var(--text-primary); outline: none; }
.sel:focus { border-color: var(--input-focus-border); }
.btn { padding: 8px 16px; border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; white-space: nowrap; transition: opacity var(--transition-fast); }
.btn-primary { background: var(--brand); color: #fff; }
.btn-primary:hover { opacity: 0.9; }

.table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; background: var(--bg-card); border-radius: var(--radius-lg); overflow: hidden; }
.table th, .table td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--table-border); }
.table th { color: var(--text-secondary); font-weight: 500; font-size: 12px; background: var(--table-header-bg); }
tr:hover td { background: var(--table-row-hover); }
.btn-sm { padding: 4px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-xs); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 12px; margin-right: 6px; transition: all var(--transition-fast); }
.btn-sm:hover { border-color: var(--brand); color: var(--brand); }
.btn-danger { color: var(--danger); border-color: var(--danger); }
.btn-danger:hover { background: var(--danger); color: #fff; }

.badge-success { display: inline-block; padding: 2px 10px; border-radius: var(--badge-radius); font-size: var(--badge-font-size); background: var(--status-done-bg); color: var(--status-done-text); }
.badge-danger { display: inline-block; padding: 2px 10px; border-radius: var(--badge-radius); font-size: var(--badge-font-size); background: var(--status-fail-bg); color: var(--status-fail-text); }

.modal-overlay { position: fixed; inset: 0; background: var(--modal-overlay); z-index: 5000; display: flex; align-items: center; justify-content: center; animation: overlay-fade-in var(--transition-base); }
.modal { background: var(--bg-card); border-radius: var(--modal-radius); padding: var(--modal-padding); width: 90%; max-width: 480px; max-height: 80vh; overflow-y: auto; box-shadow: var(--modal-shadow); animation: modal-enter var(--transition-slow); }
.modal h3 { font-size: 17px; font-weight: 600; margin-bottom: 20px; color: var(--text-primary); }
.form-group { margin-bottom: 14px; }
.form-group label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: var(--text-secondary); }
.input { padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; width: 100%; transition: border-color var(--transition-fast), box-shadow var(--transition-fast); resize: vertical; }
.input:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.input:disabled { opacity: 0.6; cursor: not-allowed; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
.btn-cancel { padding: 8px 20px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 13px; transition: all var(--transition-fast); }
.btn-cancel:hover { border-color: var(--text-muted); }
.btn-save { padding: 8px 20px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; transition: opacity var(--transition-fast); }
.btn-save:hover { opacity: 0.9; }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
