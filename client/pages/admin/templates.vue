<template>
  <AdminLayout>
    <h2 class="ptitle">模板管理</h2>
    <div class="toolbar">
      <input v-model="keyword" class="input-search" placeholder="搜索模板..." @keyup.enter="fetchData" />
      <select v-model="filterCategory" class="sel" @change="fetchData">
        <option value="">全部分类</option>
        <option value="main_image">主图</option><option value="scene">场景</option><option value="video">视频</option><option value="script">口播脚本</option><option value="copy">营销文案</option>
      </select>
      <button class="btn-primary" @click="openCreate">+ 新建模板</button>
    </div>
    <LoadingSkeleton v-if="loading" type="table" :rows="5" :cols="7" />
    <div class="table-wrap" v-else-if="list.length">
    <table class="table"><thead><tr><th>ID</th><th>标题</th><th>分类</th><th>状态</th><th>使用次数</th><th>创建时间</th><th>操作</th></tr></thead>
    <tbody><tr v-for="t in list" :key="t.id"><td>{{ t.id }}</td><td>{{ t.title }}</td><td><span class="cat-tag">{{ catLabel(t.category) }}</span></td><td><span class="status-tag" :class="statusClass(t.status)">{{ statusLabel(t.status) }}</span></td><td>{{ t.usage_count || 0 }}</td><td>{{ t.create_time?.slice(0,10) }}</td><td class="actions"><button class="btn-sm" @click="openEdit(t)">编辑</button><button v-if="t.status===1" class="btn-sm success" @click="review(t.id,2)">通过</button><button v-if="t.status===2" class="btn-sm warn" @click="review(t.id,3)">下架</button><button v-if="t.status===3" class="btn-sm" @click="review(t.id,2)">上架</button><button class="btn-sm danger" @click="deleteItem(t)">删除</button></td></tr></tbody></table>
    </div>
    <Pagination v-if="total > pageSize" :page="page" :page-size="pageSize" :total="total" @change="onPageChange" />
    <div v-if="!loading && !list.length" class="empty">暂无模板</div>

    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="showModal=false">
        <div class="modal">
          <h3>{{ editing.id ? '编辑模板' : '新建模板' }}</h3>
          <div class="form-group"><label>标题</label><input v-model="form.title" maxlength="100" class="input" /></div>
          <div class="form-row">
            <div class="form-group"><label>分类</label><select v-model="form.category" class="input"><option value="">请选择分类</option><option value="main_image">主图</option><option value="scene">场景</option><option value="video">视频</option><option value="script">口播脚本</option><option value="copy">营销文案</option></select></div>
            <div class="form-group"><label>状态</label><select v-model="form.status" class="input"><option value="">请选择状态</option><option :value="0">草稿</option><option :value="1">待审核</option><option :value="2">已上架</option><option :value="3">已下架</option></select></div>
          </div>
          <div class="form-group"><label>描述</label><input v-model="form.description" maxlength="500" class="input" /></div>
          <div class="form-group"><label>提示词内容</label><textarea v-model="form.content" maxlength="5000" class="input" rows="5" placeholder="提示词模板内容..."></textarea></div>
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
const keyword = ref(''), filterCategory = ref('')
const showModal = ref(false), editing = ref<any>({}), saving = ref(false)
const form = reactive({ title: '', description: '', category: 'main_image', content: '', icon: 'star', modelType: 'text', sortOrder: 0, isPublic: true, status: 2 })

function catLabel(c: string) {
  const m: Record<string,string> = { main_image:'主图',scene:'场景',video:'视频',script:'口播脚本',copy:'营销文案','viral-clone':'爆款复刻' }
  return m[c] || c
}
function statusLabel(s: number) { const m: Record<number,string> = { 0:'草稿',1:'待审核',2:'已上架',3:'已下架' }; return m[s]||String(s) }
function statusClass(s: number) { const m: Record<number,string> = { 0:'draft',1:'pending',2:'active',3:'banned' }; return m[s]||'' }

onMounted(fetchData)
async function fetchData() {
  loading.value = true
  try {
    const params = new URLSearchParams({ page:String(page.value), pageSize:String(pageSize) })
    if (keyword.value) params.set('keyword', keyword.value)
    if (filterCategory.value) params.set('category', filterCategory.value)
    const res: any = await $fetch(`/api/admin/prompts?${params}`, { credentials: 'include' })
    list.value = res?.data?.list || []
    total.value = res?.data?.total || 0
  } catch(e) { toast.error('加载失败') }
  loading.value = false
}
function onPageChange(p: number) { page.value = p; fetchData() }
function openCreate() { editing.value = {}; Object.assign(form, { title:'',description:'',category:'main_image',content:'',icon:'star',modelType:'text',sortOrder:0,isPublic:true,status:2 }); showModal.value = true }
function openEdit(t: any) { editing.value = t; Object.assign(form, { title:t.title,description:t.description||'',category:t.category,content:t.content,icon:t.icon,modelType:t.model_type,sortOrder:t.sort_order,isPublic:!!t.is_public,status:t.status }); showModal.value = true }

async function save() {
  saving.value = true
  try {
    const body: any = { ...form }
    if (editing.value.id) { body.id = editing.value.id; body.templateCode = editing.value.template_code }
    await $fetch('/api/admin/prompts', { method:'POST', credentials:'include', body: JSON.stringify(body) })
    showModal.value = false; fetchData()
  } catch(e: any) { toast.error(e?.data?.msg || '保存失败') }
  saving.value = false
}
async function review(id: number, status: number) {
  if (!await confirm({ message: status===2?'确认通过并上架？':'确认驳回/下架？'} )) return
  try {
    await $fetch(`/api/admin/prompts/${id}/review`, { method:'PUT', credentials:'include', body: JSON.stringify({ status, reviewRemark: status===3?'管理员操作':'' }) })
    fetchData()
  } catch(e: any) { toast.error(e?.data?.msg || '操作失败') }
}
async function deleteItem(t: any) {
  if (!await confirm({ message: `确认删除「${t.title}」？`} )) return
  try {
    await $fetch(`/api/admin/prompts/${t.id}`, { method:'DELETE', credentials:'include' })
    fetchData()
  } catch(e: any) { toast.error(e?.data?.msg || '删除失败') }
}
</script>
<style scoped>
.ptitle { font-size: 22px; font-weight: 700; color: var(--text-primary); margin-bottom: 20px; }
.toolbar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
.input-search { flex: 1; min-width: 160px; max-width: 280px; padding: 7px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast); }
.input-search:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.sel { padding: 7px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--bg-card); color: var(--text-primary); outline: none; }
.sel:focus { border-color: var(--input-focus-border); }
.btn-primary { padding: 7px 18px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; white-space: nowrap; }
.btn-primary:hover { opacity: 0.9; }
.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; background: var(--bg-card); border-radius: var(--radius-lg); overflow: hidden; }
.table th, .table td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--table-border); }
.table th { color: var(--text-secondary); font-weight: 500; font-size: 12px; background: var(--table-header-bg); }
tr:hover td { background: var(--table-row-hover); }
.cat-tag { display: inline-block; padding: 2px 8px; border-radius: var(--badge-radius); font-size: 11px; background: var(--status-processing-bg); color: var(--status-processing-text); }
.status-tag { display: inline-block; padding: 2px 8px; border-radius: var(--badge-radius); font-size: 11px; }
.status-tag.draft { background: var(--bg-hover); color: var(--text-muted); }
.status-tag.pending { background: var(--status-pending-bg); color: var(--status-pending-text); }
.status-tag.active { background: var(--status-done-bg); color: var(--status-done-text); }
.status-tag.banned { background: var(--status-fail-bg); color: var(--status-fail-text); }
.btn-sm { padding: 3px 10px; border: 1px solid var(--input-border); border-radius: var(--radius-xs); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 12px; margin-right: 4px; transition: border-color var(--transition-fast), color var(--transition-fast); }
.btn-sm:hover { border-color: var(--brand); color: var(--brand); }
.btn-sm.success { background: var(--success); color: #fff; border-color: var(--success); }
.btn-sm.warn { background: var(--warning); color: #fff; border-color: var(--warning); }
.btn-sm.danger { background: var(--danger); color: #fff; border-color: var(--danger); }
.actions { white-space: nowrap; }
.empty { text-align: center; color: var(--text-muted); padding: 40px; }
.modal-overlay { position: fixed; inset: 0; background: var(--modal-overlay); z-index: 5000; display: flex; align-items: center; justify-content: center; animation: overlay-fade-in var(--transition-base); }
.modal { background: var(--bg-card); border-radius: var(--modal-radius); padding: var(--modal-padding); width: 90%; max-width: 600px; max-height: 85vh; overflow-y: auto; box-shadow: var(--modal-shadow); animation: modal-enter var(--transition-slow); }
.modal h3 { font-size: 17px; font-weight: 600; margin-bottom: 18px; color: var(--text-primary); }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 4px; }
.form-row { display: flex; gap: 12px; }
.form-row .form-group { flex: 1; }
.input { width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast); resize: vertical; }
.input:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px; }
.btn-cancel { padding: 8px 20px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 13px; }
.btn-cancel:hover { border-color: var(--text-muted); }
.btn-save { padding: 8px 20px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; }
.btn-save:hover { opacity: 0.9; }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
