<template>
  <WorkLayout>
    <h2 class="ptitle">我的提示词模板</h2>

    <div class="toolbar">
      <select v-model="filterCategory" class="sel" @change="fetchData">
        <option value="">全部分类</option>
        <option value="image">图片类</option>
        <option value="text">文案类</option>
        <option value="video">视频类</option>
        <option value="voice">语音类</option>
      </select>
      <input v-model="keyword" type="text" placeholder="搜索我的模板..." @keyup.enter="fetchData" />
      <button class="btn btn-primary" @click="goBrowse">去官方模板库复制</button>
    </div>

    <LoadingSkeleton v-if="loading" type="cards" :count="4" />

    <div class="card-grid" v-if="!loading && list.length">
      <div v-for="t in list" :key="t.id" class="tpl-card" :class="{ draft: t.status === 0, submitted: t.status === 1 }">
        <div class="card-header">
          <span class="card-category">{{ categoryLabel(t.category) }}</span>
          <span class="card-status" :class="statusClass(t.status)">{{ statusLabel(t.status) }}</span>
        </div>
        <h3 class="card-title">{{ t.title }}</h3>
        <p class="card-code monospace">{{ t.template_code }}</p>
        <p class="card-tags" v-if="t.tags">{{ (t.tags || '').split(',').filter(Boolean).slice(0,3).join(' · ') }}</p>
        <p class="card-meta">更新于 {{ (t.update_time || t.create_time || '').slice(0, 10) }}</p>
        <div class="card-actions">
          <button class="btn-sm btn-primary" @click="openEdit(t)">编辑</button>
          <button v-if="t.status === 0" class="btn-sm success" @click="submitTemplate(t.id)">提交收录</button>
          <button class="btn-sm danger" @click="confirmDelete(t)">删除</button>
        </div>
      </div>
    </div>

    <div v-if="!loading && !list.length" class="empty">
      <p>还没有私有模板</p>
      <button class="btn btn-primary" @click="goBrowse">去官方模板库一键复制</button>
    </div>

    <Pagination v-if="total > pageSize" :page="page" :page-size="pageSize" :total="total" @change="onPageChange" />

    <!-- 编辑弹窗 -->
    <Teleport to="body">
      <div class="modal-overlay" v-if="showModal" @click.self="showModal = false" @keydown.escape="showModal = false">
        <div class="modal">
          <h3>编辑模板</h3>
          <div class="form-group">
            <label>标题</label>
            <input v-model="editForm.title" maxlength="100" type="text" />
          </div>
          <div class="form-group">
            <label>内容（支持 {{变量名}} 占位符）</label>
            <textarea v-model="editForm.content" maxlength="5000" rows="6" placeholder="输入提示词模板内容..."></textarea>
          </div>
          <div class="form-group">
            <label>行业/风格标签（逗号分隔）</label>
            <input v-model="editForm.tags" maxlength="256" type="text" placeholder="如：服装,抖音,简约" />
          </div>
          <div class="form-group">
            <label>描述</label>
            <input v-model="editForm.description" maxlength="500" type="text" placeholder="简短描述模板用途" />
          </div>
          <div class="modal-actions">
            <button class="btn" @click="showModal = false">取消</button>
            <button class="btn btn-primary" @click="saveEdit">保存</button>
          </div>
        </div>
      </div>
    </Teleport>
  </WorkLayout>
</template>

<script setup lang="ts">
const { t } = useI18n()
const { confirm } = useConfirm()
const toast = useToast()

const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(12)
const keyword = ref('')
const filterCategory = ref('')
const loading = ref(false)
const showModal = ref(false)
const editingId = ref<number | null>(null)

const editForm = reactive({ title: '', content: '', tags: '', description: '' })

const navigateTo = (await import('nuxt/app')).navigateTo

function goBrowse() {
  navigateTo('/work/prompt-hub')
}

onMounted(() => fetchData())

async function fetchData() {
  loading.value = true
  try {
    const params = new URLSearchParams({ page: String(page.value), pageSize: String(pageSize.value) })
    if (keyword.value) params.set('keyword', keyword.value)
    if (filterCategory.value) params.set('category', filterCategory.value)
    const res = await $fetch(`/api/prompts/my-templates?${params}`, { credentials: 'include' })
    list.value = (res as any).data?.list || []
    total.value = (res as any).data?.total || 0
  } catch (e: any) {
    toast.error('加载失败: ' + (e?.data?.msg || e.message || '网络错误'))
  } finally { loading.value = false }
}

function onPageChange(p: number) { page.value = p; fetchData() }

function openEdit(t: any) {
  editingId.value = t.id
  editForm.title = t.title
  editForm.content = t.content
  editForm.tags = t.tags || ''
  editForm.description = t.description || ''
  showModal.value = true
}

async function saveEdit() {
  try {
    await $fetch(`/api/prompts/templates/${editingId.value}`, {
      method: 'PUT',
      credentials: 'include',
      body: JSON.stringify({ ...editForm }),
    })
    showModal.value = false
    toast.success('保存成功，工作流实时生效')
    fetchData()
  } catch (e: any) {
    toast.error('保存失败: ' + (e?.data?.msg || e.message))
  }
}

async function submitTemplate(id: number) {
  if (!await confirm({ message: '确认提交此模板给运营审核吗？审核通过后将收录为官方模板，全平台商家可用。' })) return
  try {
    await $fetch(`/api/prompts/templates/${id}/submit-official`, { method: 'POST', credentials: 'include' })
    toast.success('已提交审核')
    fetchData()
  } catch (e: any) {
    toast.error('提交失败: ' + (e?.data?.msg || e.message))
  }
}

async function confirmDelete(t: any) {
  if (!await confirm({ message: `确认删除"${t.title}"吗？删除后工作流将回退到官方模板。` })) return
  try {
    await $fetch(`/api/admin/prompts/${t.id}`, { method: 'DELETE', credentials: 'include' })
    toast.success('已删除')
    fetchData()
  } catch (e: any) {
    toast.error('删除失败: ' + (e?.data?.msg || e.message))
  }
}

function categoryLabel(c: string) {
  const map: Record<string, string> = { image: '图片类', text: '文案类', video: '视频类', voice: '语音类', detail: '详情页', main_image: '主图', scene: '场景图', copy: '文案', script: '脚本', 'viral-clone': '爆款复刻' }
  return map[c] || c
}
function statusLabel(s: number) {
  const map: Record<number, string> = { 0: '草稿', 1: '待审核', 2: '已收录', 3: '已驳回' }
  return map[s] || String(s)
}
function statusClass(s: number) {
  const map: Record<number, string> = { 0: 'draft', 1: 'pending', 2: 'active' }
  return map[s] || ''
}
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.ptitle { font-size: 20px; font-weight: 700; margin-bottom: 20px; color: var(--text-primary); }
.toolbar { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
.toolbar input { padding: 6px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); width: 200px; font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; }
.sel { padding: 6px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); background: var(--bg-card); color: var(--text-primary); font-size: 13px; outline: none; }
.btn { padding: 6px 14px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 13px; }
.btn:hover { border-color: var(--brand); color: var(--brand); }
.btn-primary { background: var(--brand); color: var(--text-on-brand); border-color: var(--brand); }
.btn-primary:hover { opacity: 0.9; color: var(--text-on-brand); }
.btn-sm { padding: 4px 10px; font-size: 12px; border: 1px solid var(--input-border); border-radius: var(--radius-xs); cursor: pointer; margin-right: 4px; background: var(--bg-card); color: var(--text-primary); }
.btn-sm.success { background: var(--success); color: var(--text-on-brand); border-color: var(--success); }
.btn-sm.danger { background: var(--danger); color: var(--text-on-brand); border-color: var(--danger); }
.btn-sm.btn-primary { background: var(--brand); color: var(--text-on-brand); border-color: var(--brand); }

.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
.tpl-card { background: var(--bg-card); border: 1px solid var(--table-border); border-radius: var(--radius-lg); padding: 16px; transition: box-shadow var(--transition-fast); }
.tpl-card:hover { box-shadow: var(--card-shadow); }
.tpl-card.draft { border-left: 3px solid var(--text-muted); }
.tpl-card.submitted { border-left: 3px solid var(--status-pending-text); }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.card-category { font-size: 12px; padding: 2px 8px; border-radius: var(--badge-radius); background: var(--status-processing-bg); color: var(--status-processing-text); }
.card-status { font-size: 11px; padding: 2px 6px; border-radius: var(--badge-radius); }
.card-status.draft { background: var(--bg-hover); color: var(--text-muted); }
.card-status.pending { background: var(--status-pending-bg); color: var(--status-pending-text); }
.card-status.active { background: var(--status-done-bg); color: var(--status-done-text); }
.card-title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; }
.card-code { font-size: 11px; color: var(--text-muted); margin-bottom: 6px; word-break: break-all; }
.card-tags { font-size: 12px; color: var(--text-secondary); margin-bottom: 6px; }
.card-meta { font-size: 11px; color: var(--text-muted); margin-bottom: 12px; }
.card-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.monospace { font-family: monospace; }
.empty { text-align: center; color: var(--text-muted); padding: 60px 20px; }
.empty p { margin-bottom: 16px; font-size: 15px; }

.modal-overlay { position: fixed; inset: 0; background: var(--modal-overlay); display: flex; align-items: center; justify-content: center; z-index: 999; }
.modal { background: var(--bg-card); border-radius: var(--modal-radius); padding: var(--modal-padding); width: 90%; max-width: 640px; max-height: 90vh; overflow-y: auto; box-shadow: var(--modal-shadow); }
.modal h3 { margin-bottom: 16px; color: var(--text-primary); font-size: 17px; font-weight: 600; }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 4px; }
.form-group input, .form-group textarea { width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 14px; background: var(--bg-input); color: var(--text-primary); outline: none; }
.form-group input:focus, .form-group textarea:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.form-group textarea { resize: vertical; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }
</style>
