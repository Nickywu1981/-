<template>
  <div class="collections-page">
    <div class="page-header">
      <h1>我的合集</h1>
      <div class="header-actions">
        <input v-model="search" placeholder="搜索合集..." class="search-input" @input="onSearch" />
        <button class="btn-primary" @click="showCreate = true">+ 新建合集</button>
      </div>
    </div>

    <LoadingSkeleton v-if="loading" type="card" :rows="3" />

    <div v-else-if="error" class="error-state">
      <span class="error-icon">⚠️</span>
      <p>{{ error }}</p>
      <button class="btn-outline" @click="fetchData">重试</button>
    </div>

    <EmptyState
      v-else-if="!list.length"
      icon="📁"
      title="还没有合集"
      description="将喜欢的作品收藏到合集中，方便管理和分享"
      action-label="新建合集"
      @action="showCreate = true"
    />

    <div v-else class="collection-grid">
      <div v-for="item in list" :key="item.id" class="collection-card" @click="viewCollection(item)">
        <div class="card-cover">
          <img v-if="item.cover_url" :src="item.cover_url" :alt="item.name" loading="lazy" @error="e => (e.target as HTMLImageElement).style.display='none'" />
          <span v-else class="cover-placeholder">{{ item.name?.slice(0, 2) }}</span>
          <span v-if="item.is_public" class="badge-public">公开</span>
        </div>
        <div class="card-body">
          <h3>{{ item.name }}</h3>
          <p>{{ item.item_count ?? 0 }} 个作品</p>
          <p class="card-desc" v-if="item.description">{{ item.description }}</p>
        </div>
        <div class="card-actions">
          <button class="btn-icon" title="编辑" @click.stop="startEdit(item)">✏️</button>
          <button class="btn-icon" title="分享" @click.stop="shareCollection(item)">🔗</button>
          <button class="btn-icon danger" title="删除" @click.stop="deleteItem(item)">🗑️</button>
        </div>
      </div>
    </div>

    <Pagination
      v-if="total > pageSize"
      :page="page" :total="total" :page-size="pageSize"
      @update:page="(p: number) => { page = p; fetchData() }"
    />

    <!-- Create Modal -->
    <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
      <div class="modal">
        <h3>新建合集</h3>
        <label class="field-label">合集名称</label>
        <input v-model="form.name" placeholder="例如：夏季新品、节日素材..." class="input" maxlength="50" />
        <label class="field-label">描述（可选）</label>
        <textarea v-model="form.desc" placeholder="简要描述合集内容..." class="input textarea" rows="2" maxlength="200" />
        <label class="checkbox-label">
          <input type="checkbox" v-model="form.isPublic" /> 公开合集（其他人可见）
        </label>
        <div class="modal-actions">
          <button class="btn-outline" @click="showCreate = false">取消</button>
          <button class="btn-primary" :disabled="!form.name || saving" @click="createCollection">
            {{ saving ? '创建中...' : '创建' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <div v-if="editing" class="modal-overlay" @click.self="editing = null">
      <div class="modal">
        <h3>编辑合集</h3>
        <label class="field-label">名称</label>
        <input v-model="editForm.name" class="input" />
        <label class="field-label">描述</label>
        <textarea v-model="editForm.description" class="input textarea" rows="2" />
        <div class="modal-actions">
          <button class="btn-outline" @click="editing = null">取消</button>
          <button class="btn-primary" :disabled="!editForm.name" @click="saveEdit">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

const { confirm } = useConfirm()
import { copyToClipboard } from '@/utils/format';


const toast = useToast()
const list: Ref<any[]> = ref([])
const loading = ref(true)
const error = ref('')
const page = ref(1)
const total = ref(0)
const pageSize = ref(12)
const search = ref('')
const showCreate = ref(false)
const saving = ref(false)
const editing: Ref<any | null> = ref(null)
const form = reactive({ name: '', desc: '', isPublic: false })
const editForm = reactive({ name: '', description: '' })
let searchTimer: ReturnType<typeof setTimeout> | null = null

async function fetchData() {
  loading.value = true; error.value = ''
  try {
    const params = new URLSearchParams({ page: String(page.value), pageSize: String(pageSize.value) })
    if (search.value) params.set('keyword', search.value)
    const res: any = await $fetch(`/api/collections?${params}`)
    list.value = res.data?.list || res.data || []
    total.value = res.data?.total || 0
  } catch (e: any) {
    error.value = e.message || '加载失败'
    toast.error(error.value)
  } finally { loading.value = false }
}

async function createCollection() {
  saving.value = true
  try {
    await $fetch('/api/collections', {
      method: 'POST',
      body: { name: form.name, description: form.desc, is_public: form.isPublic ? 1 : 0 },
    })
    showCreate.value = false
    form.name = ''; form.desc = ''; form.isPublic = false
    toast.success('合集创建成功')
    fetchData()
  } catch (e: any) {
    toast.error(e.message || '创建失败')
  } finally { saving.value = false }
}

function startEdit(item: any) {
  editing.value = item
  editForm.name = item.name
  editForm.description = item.description || ''
}

async function saveEdit() {
  if (!editing.value) return
  try {
    await $fetch(`/api/collections/${editing.value.id}`, {
      method: 'PUT',
      body: { name: editForm.name, description: editForm.description },
    })
    toast.success('已更新')
    editing.value = null
    fetchData()
  } catch (e: any) {
    toast.error(e.message || '更新失败')
  }
}

async function deleteItem(item: any) {
  if (!await confirm({ message: `确定删除合集「${item.name}」？此操作不可恢复。`)) return
  try {
    await $fetch(`/api/collections/${item.id}`, { method: 'DELETE' })
    toast.success('已删除')
    fetchData()
  } catch (e: any) {
    toast.error(e.message || '删除失败')
  }
}

function viewCollection(item: any) {
  navigateTo(`/my/collections?id=${item.id}`)
}

async function shareCollection(item: any) {
  const url = `${window.location.origin}/my/collections?id=${item.id}`
  const ok = await copyToClipboard(url)
  if (ok) {
    toast.success('链接已复制到剪贴板')
  } else {
    prompt('复制此链接分享合集:', url)
  }
}

function onSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; fetchData() }, 300)
}

onMounted(() => fetchData())
onBeforeUnmount(() => { if (searchTimer) clearTimeout(searchTimer) })
</script>

<style scoped>
.collections-page { max-width: 1200px; margin: 0 auto; padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
h1 { font-size: 24px; font-weight: 700; color: var(--text-primary); }
.header-actions { display: flex; gap: 10px; align-items: center; }
.search-input { padding: 8px 14px; border: 1px solid var(--border-light); border-radius: var(--radius-md); background: var(--bg-card); color: var(--text-primary); font-size: 13px; width: 200px; transition: border-color var(--transition-fast); }
.search-input:focus { outline: none; border-color: var(--brand); }
.btn-primary { padding: 8px 20px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: 13px; font-weight: 500; transition: opacity var(--transition-fast); }
.btn-primary:hover { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-outline { padding: 8px 20px; border: 1px solid var(--border-light); border-radius: var(--radius-md); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 13px; transition: border-color var(--transition-fast); }
.btn-outline:hover { border-color: var(--brand); }
.error-state { text-align: center; padding: 60px 20px; }
.error-icon { font-size: 48px; }
.error-state p { color: var(--text-muted); margin: 12px 0 20px; }

.collection-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
.collection-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-lg); overflow: hidden; cursor: pointer; transition: all var(--transition-fast); }
.collection-card:hover { border-color: var(--brand); transform: translateY(-2px); box-shadow: var(--shadow-card); }
.card-cover { height: 140px; background: var(--bg-secondary); display: flex; align-items: center; justify-content: center; position: relative; }
.card-cover img { width: 100%; height: 100%; object-fit: cover; }
.cover-placeholder { font-size: 32px; font-weight: 700; color: var(--brand); }
.badge-public { position: absolute; top: 8px; right: 8px; padding: 2px 8px; background: var(--brand); color: #fff; border-radius: 10px; font-size: 11px; }
.card-body { padding: 14px 16px; }
.card-body h3 { font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
.card-body p { font-size: 12px; color: var(--text-secondary); }
.card-desc { margin-top: 4px; font-size: 12px; color: var(--text-muted); }
.card-actions { display: flex; gap: 4px; padding: 0 12px 12px; justify-content: flex-end; }
.btn-icon { width: 32px; height: 32px; border: none; background: transparent; cursor: pointer; font-size: 14px; border-radius: var(--radius-sm); transition: background var(--transition-fast); }
.btn-icon:hover { background: var(--bg-secondary); }
.btn-icon.danger:hover { background: var(--status-fail-bg); }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: var(--bg-card); border-radius: var(--radius-xl); padding: 24px; width: 90%; max-width: 420px; box-shadow: var(--shadow-modal); }
.modal h3 { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: var(--text-primary); }
.field-label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 4px; font-weight: 500; }
.input { width: 100%; padding: 8px 12px; border: 1px solid var(--border-light); border-radius: var(--radius-md); background: var(--bg-input); color: var(--text-primary); font-size: 14px; margin-bottom: 12px; transition: border-color var(--transition-fast); box-sizing: border-box; }
.input:focus { outline: none; border-color: var(--brand); }
.textarea { resize: vertical; font-family: inherit; }
.checkbox-label { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-secondary); margin-bottom: 16px; cursor: pointer; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; }

@media (max-width: 640px) {
  .collections-page { padding: 16px; }
  .page-header { flex-direction: column; align-items: stretch; }
  .header-actions { flex-direction: column; }
  .search-input { width: 100%; }
  .collection-grid { grid-template-columns: 1fr; }
}
</style>
