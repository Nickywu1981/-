<template>
  <AdminLayout>
    <h2 class="ptitle">作品集管理</h2>
    <div class="toolbar">
      <button class="btn-primary" @click="openCreate">+ 新建作品集</button>
    </div>
    <LoadingSkeleton v-if="loading" type="table" :rows="5" :cols="6" />
    <div class="table-wrap" v-else-if="list.length">
    <table class="table"><thead><tr><th>ID</th><th>名称</th><th>类型</th><th>创建时间</th><th>操作</th></tr></thead>
    <tbody><tr v-for="c in list" :key="c.id"><td>{{ c.id }}</td><td>{{ c.name }}</td><td><span class="type-tag">{{ typeLabel(c.type) }}</span></td><td>{{ c.created_at?.slice(0,10) || '-' }}</td><td><button class="btn-sm" @click="openEdit(c)">编辑</button><button class="btn-sm btn-danger" @click="deleteItem(c.id)">删除</button></td></tr></tbody></table>
    </div>
    <Pagination v-if="total > pageSize" :page="page" :page-size="pageSize" :total="total" @change="onPageChange" />
    <EmptyState v-else icon="🖼️" title="暂无作品集" description="创建您的第一个作品集" action-label="新建作品集" @action="openCreate" />

    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="showModal=false">
        <div class="modal">
          <h3>{{ editing ? '编辑作品集' : '新建作品集' }}</h3>
          <div class="form-group"><label>名称</label><input v-model="editForm.name" maxlength="100" class="input" placeholder="作品集名称" /></div>
          <div class="form-group"><label>类型</label>
            <select v-model="editForm.type" class="input">
              <option value="">请选择类型</option>
              <option value="image">图片</option><option value="video">视频</option>
              <option value="template">模板</option><option value="prompt">提示词</option>
            </select>
          </div>
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

const { confirm } = useConfirm()

const toast = useToast()
const list = ref<any[]>([]), total = ref(0), page = ref(1), pageSize = 20, loading = ref(true)
const showModal = ref(false), editing = ref<any>(null), saving = ref(false)
const editForm = reactive({ name: '', type: 'image' })

function typeLabel(t: string) { return { image:'图片', video:'视频', template:'模板', prompt:'提示词' }[t] || t }

async function fetchData() {
  loading.value = true
  try {
    const params = new URLSearchParams({ page: String(page.value), pageSize: String(pageSize) })
    const data: any = await $fetch(`/api/collections?${params}`, { credentials: 'include' })
    list.value = data?.data?.list || data?.data || []
    if (!Array.isArray(list.value)) list.value = []
    total.value = data?.data?.total || 0
  } catch(e) { toast.error('加载失败') }
  loading.value = false
}

function onPageChange(p: number) { page.value = p; fetchData() }

function openCreate() { editing.value = null; editForm.name = ''; editForm.type = 'image'; showModal.value = true }
function openEdit(c: any) { editing.value = c; editForm.name = c.name; editForm.type = c.type || 'image'; showModal.value = true }

async function save() {
  saving.value = true
  try {
    if (editing.value) {
      await $fetch(`/api/collections/${editing.value.id}`, { method: 'PUT', credentials: 'include', body: editForm })
    } else {
      await $fetch('/api/collections', { method: 'POST', credentials: 'include', body: editForm })
    }
    showModal.value = false; fetchData()
  } catch(e: any) { toast.error(e?.data?.msg || '保存失败') }
  saving.value = false
}

async function deleteItem(id: number) {
  if (!await confirm({ message: '确定删除?'} )) return
  try {
    await $fetch(`/api/collections/${id}`, { method: 'DELETE', credentials: 'include' })
    fetchData()
  } catch(e: any) { toast.error(e?.data?.msg || '删除失败') }
}

onMounted(fetchData)
</script>
<style scoped>
h2 { font-size: 22px; font-weight: 700; color: var(--text-primary); margin-bottom: 20px; }
.toolbar { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
.btn-primary { padding: 8px 20px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; white-space: nowrap; transition: opacity var(--transition-fast); }
.btn-primary:hover { opacity: 0.9; }
.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; background: var(--bg-card); border-radius: var(--radius-lg); overflow: hidden; }
.table th, .table td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--table-border); }
.table th { color: var(--text-secondary); font-weight: 500; font-size: 12px; background: var(--table-header-bg); }
tr:hover td { background: var(--table-row-hover); }
.type-tag { display: inline-block; padding: 2px 10px; border-radius: var(--badge-radius); font-size: var(--badge-font-size); background: var(--brand-light); color: var(--brand); }
.btn-sm { padding: 4px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-xs); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 12px; margin-right: 6px; transition: border-color var(--transition-fast), color var(--transition-fast); }
.btn-sm:hover { border-color: var(--brand); color: var(--brand); }
.btn-danger { color: var(--danger); border-color: var(--danger); }
.btn-danger:hover { background: var(--danger); color: #fff; }
.modal-overlay { position: fixed; inset: 0; background: var(--modal-overlay); z-index: 5000; display: flex; align-items: center; justify-content: center; animation: overlay-fade-in var(--transition-base); }
.modal { background: var(--bg-card); border-radius: var(--modal-radius); padding: var(--modal-padding); width: 90%; max-width: 440px; max-height: 80vh; overflow-y: auto; box-shadow: var(--modal-shadow); animation: modal-enter var(--transition-slow); }
.modal h3 { font-size: 17px; font-weight: 600; margin-bottom: 20px; color: var(--text-primary); }
.form-group { margin-bottom: 14px; }
.form-group label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: var(--text-secondary); }
.input { padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; width: 100%; transition: border-color var(--transition-fast); }
.input:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
.btn-cancel { padding: 8px 20px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 13px; }
.btn-cancel:hover { border-color: var(--text-muted); }
.btn-save { padding: 8px 20px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; }
.btn-save:hover { opacity: 0.9; }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
