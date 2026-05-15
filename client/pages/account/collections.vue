<template>
  <div class="collections-page">
    <div class="page-header">
      <h1>{{ $t('account_pages.collections.title') }}</h1>
      <div class="header-actions">
        <input v-model="search" :placeholder="$t('account_pages.collections.search_placeholder')" class="search-input" @input="onSearch" />
        <button class="btn-primary" @click="showCreate = true">{{ $t('account_pages.collections.new_collection') }}</button>
      </div>
    </div>

    <LoadingSkeleton v-if="loading" type="card" :rows="3" />

    <div v-else-if="error" class="error-state">
      <span class="error-icon">⚠</span>
      <p>{{ error }}</p>
      <button class="btn-outline" @click="fetchData">{{ $t('common.retry') }}</button>
    </div>

    <EmptyState
      v-else-if="!list.length"
      icon="📁"
      :title="$t('account_pages.collections.empty_title')"
      :description="$t('account_pages.collections.empty_desc')"
      :action-label="$t('account_pages.collections.empty_action')"
      @action="showCreate = true"
    />

    <div v-else class="collection-grid">
      <div v-for="item in list" :key="item.id" class="collection-card" @click="viewCollection(item)">
        <div class="card-cover">
          <img v-if="item.cover_url" :src="item.cover_url" :alt="item.name" loading="lazy" @error="e => (e.target as HTMLImageElement).style.display='none'" />
          <span v-else class="cover-placeholder">{{ item.name?.slice(0, 2) }}</span>
          <span v-if="item.is_public" class="badge-public">{{ $t('account_pages.collections.public_badge') }}</span>
        </div>
        <div class="card-body">
          <h3>{{ item.name }}</h3>
          <p>{{ $t('account_pages.collections.items_count', { count: item.item_count ?? 0 }) }}</p>
          <p class="card-desc" v-if="item.description">{{ item.description }}</p>
        </div>
        <div class="card-actions">
          <button class="btn-icon" :title="$t('account_pages.collections.edit')" :aria-label="$t('account_pages.collections.edit')" @click.stop="startEdit(item)">✏</button>
          <button class="btn-icon" :title="$t('account_pages.collections.share')" :aria-label="$t('account_pages.collections.share')" @click.stop="shareCollection(item)">🔗</button>
          <button class="btn-icon danger" :title="$t('account_pages.collections.delete')" :aria-label="$t('account_pages.collections.delete')" @click.stop="deleteItem(item)">🗑</button>
        </div>
      </div>
    </div>

    <Pagination
      v-if="total > pageSize"
      :page="page" :total="total" :page-size="pageSize"
      @update:page="(p: number) => { page = p; fetchData() }"
    />

    <!-- Create Modal -->
    <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false" @keydown.escape="showCreate = false">
      <div class="modal">
        <h3>{{ $t('account_pages.collections.create_modal_title') }}</h3>
        <label class="field-label">{{ $t('account_pages.collections.name_label') }}</label>
        <input v-model="form.name" :placeholder="$t('account_pages.collections.name_placeholder')" class="input" maxlength="50" />
        <label class="field-label">{{ $t('account_pages.collections.desc_label') }}</label>
        <textarea v-model="form.desc" :placeholder="$t('account_pages.collections.desc_placeholder')" class="input textarea" rows="2" maxlength="200" />
        <label class="checkbox-label">
          <input type="checkbox" v-model="form.isPublic" /> {{ $t('account_pages.collections.public_checkbox') }}
        </label>
        <div class="modal-actions">
          <button class="btn-outline" @click="showCreate = false">{{ $t('common.cancel') }}</button>
          <button class="btn-primary" :disabled="!form.name || saving" @click="createCollection">
            {{ saving ? $t('account_pages.collections.creating') : $t('account_pages.collections.create_btn') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <div v-if="editing" class="modal-overlay" @click.self="editing = null" @keydown.escape="editing = null">
      <div class="modal">
        <h3>{{ $t('account_pages.collections.edit_modal_title') }}</h3>
        <label class="field-label">{{ $t('account_pages.collections.edit_name_label') }}</label>
        <input v-model="editForm.name" class="input" />
        <label class="field-label">{{ $t('account_pages.collections.edit_desc_label') }}</label>
        <textarea v-model="editForm.description" class="input textarea" rows="2" />
        <div class="modal-actions">
          <button class="btn-outline" @click="editing = null">{{ $t('common.cancel') }}</button>
          <button class="btn-primary" :disabled="!editForm.name" @click="saveEdit">{{ $t('account_pages.collections.save') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

const { t } = useI18n()
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
    const params = new URLSearchParams({ page: String(page.value), size: String(pageSize.value) })
    if (search.value) params.set('keyword', search.value)
    const res: any = await $fetch(`/api/collections?${params}`)
    list.value = res.data?.list || res.data || []
    total.value = res.data?.total || 0
  } catch (e: unknown) {
    const err = e as { data?: { msg?: string }; message?: string };
    error.value = err?.data?.msg || err.message || t('account_pages.collections.create_fail')
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
    toast.success(t('account_pages.collections.create_success'))
    fetchData()
  } catch (e: unknown) {
    const err = e as { data?: { msg?: string }; message?: string };
    toast.error(err?.data?.msg || err.message || t('account_pages.collections.create_fail'))
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
    toast.success(t('account_pages.collections.update_success'))
    editing.value = null
    fetchData()
  } catch (e: unknown) {
    const err = e as { data?: { msg?: string }; message?: string };
    toast.error(err?.data?.msg || err.message || t('account_pages.collections.update_fail'))
  }
}

async function deleteItem(item: any) {
  if (!await confirm({ message: t('account_pages.collections.delete_confirm', { name: item.name }) })) return
  try {
    await $fetch(`/api/collections/${item.id}`, { method: 'DELETE' })
    toast.success(t('account_pages.collections.delete_success'))
    fetchData()
  } catch (e: unknown) {
    const err = e as { data?: { msg?: string }; message?: string };
    toast.error(err?.data?.msg || err.message || t('account_pages.collections.delete_fail'))
  }
}

function viewCollection(item: any) {
  navigateTo(`/my/collections?id=${item.id}`)
}

async function shareCollection(item: any) {
  if (!process.client) return
  const url = `${window.location.origin}/my/collections?id=${item.id}`
  const ok = await copyToClipboard(url)
  if (ok) {
    toast.success(t('account_pages.collections.copy_success'))
  } else {
    prompt(t('account_pages.collections.copy_prompt'), url)
  }
}

function onSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; fetchData() }, 300)
}

onMounted(() => fetchData())
onBeforeUnmount(() => { if (searchTimer) clearTimeout(searchTimer) })
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
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
.collection-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-lg); overflow: hidden; cursor: pointer; transition: border-color var(--transition-fast), transform var(--transition-fast), box-shadow var(--transition-fast); }
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
