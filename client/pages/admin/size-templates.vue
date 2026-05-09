<template>
  <AdminLayout>
    <h2 class="ptitle">尺寸模板管理</h2>
    <div class="toolbar">
      <select v-model="filterPlatform" class="sel" @change="fetchData">
        <option value="">全部平台</option>
        <option v-for="p in platforms" :key="p" :value="p">{{ p }}</option>
      </select>
      <button class="btn btn-primary" @click="openCreate">+ 新建尺寸</button>
    </div>
    <LoadingSkeleton v-if="loading" type="table" :rows="5" :cols="7" />
    <div class="table-wrap" v-else-if="list.length">
    <table class="table"><thead><tr><th>ID</th><th>名称</th><th>平台</th><th>宽度</th><th>高度</th><th>分类</th><th>操作</th></tr></thead>
    <tbody><tr v-for="s in list" :key="s.id"><td>{{ s.id }}</td><td>{{ s.name }}</td><td>{{ s.platform }}</td><td>{{ s.width }}px</td><td>{{ s.height }}px</td><td>{{ s.category || '通用' }}</td><td><button class="btn-sm" @click="openEdit(s)">编辑</button><button class="btn-sm btn-danger" @click="deleteItem(s.id)">删除</button></td></tr></tbody></table>
    </div>
    <EmptyState v-else icon="📐" title="暂无尺寸模板" description="添加电商平台图片尺寸预设" action-label="新建尺寸" @action="openCreate" />

    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="showModal=false">
        <div class="modal">
          <h3>{{ editing ? '编辑尺寸' : '新建尺寸' }}</h3>
          <div class="form-grid">
            <label>名称 <input v-model="editForm.name" class="input" /></label>
            <label>平台
              <select v-model="editForm.platform" class="input">
                <option v-for="p in platforms" :key="p" :value="p">{{ p }}</option>
              </select>
            </label>
            <label>宽度(px) <input v-model.number="editForm.width" type="number" class="input" /></label>
            <label>高度(px) <input v-model.number="editForm.height" type="number" class="input" /></label>
            <label>分类 <input v-model="editForm.category" class="input" placeholder="如：主图、详情图" /></label>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" @click="showModal=false">取消</button>
            <button class="btn-save" :disabled="saving" @click="saveTemplate">{{ saving?'保存中...':'保存' }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </AdminLayout>
</template>
<script setup lang="ts">

const toast = useToast()
const list = ref<any[]>([]), loading = ref(true), filterPlatform = ref('')
const showModal = ref(false), editing = ref<any>(null), saving = ref(false)
const editForm = reactive({ name: '', platform: '', width: 800, height: 800, category: '' })
const platforms = ['淘宝', '天猫', '京东', '拼多多', '抖音', '快手', 'Amazon', 'Shopee', 'Lazada', 'eBay', 'Shopify', 'Walmart', 'TikTok Shop']

async function fetchData() {
  loading.value = true
  try {
    const data: any = await $fetch('/api/templates/my', { credentials: 'include' })
    let items = data?.data?.list || data?.data || []
    if (filterPlatform.value) items = items.filter((i: any) => i.platform === filterPlatform.value)
    list.value = items
  } catch(e) { toast.error('加载失败') }
  loading.value = false
}

function openCreate() {
  editing.value = null
  editForm.name = ''; editForm.platform = ''; editForm.width = 800; editForm.height = 800; editForm.category = ''
  showModal.value = true
}
function openEdit(s: any) {
  editing.value = s
  editForm.name = s.name; editForm.platform = s.platform
  editForm.width = s.width; editForm.height = s.height; editForm.category = s.category || ''
  showModal.value = true
}
async function saveTemplate() {
  saving.value = true
  try {
    if (editing.value) {
      await $fetch(`/api/templates/my/${editing.value.id}`, { method: 'PUT', body: editForm, credentials: 'include' })
    } else {
      await $fetch('/api/templates/my', { method: 'POST', body: editForm, credentials: 'include' })
    }
    showModal.value = false
    fetchData()
  } catch(e: any) { toast.error(e.data?.msg || '保存失败') }
  saving.value = false
}
async function deleteItem(id: number) {
  if (!confirm('确定删除?')) return
  try {
    await $fetch(`/api/templates/my/${id}`, { method: 'DELETE', credentials: 'include' })
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

.modal-overlay { position: fixed; inset: 0; background: var(--modal-overlay); z-index: 5000; display: flex; align-items: center; justify-content: center; animation: overlay-fade-in var(--transition-base); }
.modal { background: var(--bg-card); border-radius: var(--modal-radius); padding: var(--modal-padding); width: 90%; max-width: 520px; max-height: 80vh; overflow-y: auto; box-shadow: var(--modal-shadow); animation: modal-enter var(--transition-slow); }
.modal h3 { font-size: 17px; font-weight: 600; margin-bottom: 20px; color: var(--text-primary); }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-grid label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: var(--text-secondary); }
.input { padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; width: 100%; transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.input:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
.btn-cancel { padding: 8px 20px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 13px; transition: all var(--transition-fast); }
.btn-cancel:hover { border-color: var(--text-muted); }
.btn-save { padding: 8px 20px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; transition: opacity var(--transition-fast); }
.btn-save:hover { opacity: 0.9; }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

@media (max-width: 640px) { .form-grid { grid-template-columns: 1fr; } }
</style>
