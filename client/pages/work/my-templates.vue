<template>
  <WorkLayout>
    <h2 class="ptitle">{{ $t('work_pages.my_templates_title') }}</h2>

    <div class="toolbar">
      <select v-model="filterCategory" class="sel" @change="fetchData">
        <option value="">{{ $t('work_pages.my_templates_all') }}</option>
        <option value="image">{{ $t('work_pages.my_templates_cat_image') }}</option>
        <option value="text">{{ $t('work_pages.my_templates_cat_text') }}</option>
        <option value="video">{{ $t('work_pages.my_templates_cat_video') }}</option>
        <option value="voice">{{ $t('work_pages.my_templates_cat_voice') }}</option>
      </select>
      <input v-model="keyword" type="text" :placeholder="$t('work_pages.my_templates_search_placeholder')" @keyup.enter="fetchData" />
      <button class="btn btn-primary" @click="goBrowse">{{ $t('work_pages.my_templates_btn_browse') }}</button>
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
        <p class="card-meta">{{ $t('work_pages.my_templates_updated_prefix') }}{{ (t.update_time || t.create_time || '').slice(0, 10) }}</p>
        <div class="card-actions">
          <button class="btn-sm btn-primary" @click="openEdit(t)">{{ $t('work_pages.my_templates_btn_edit') }}</button>
          <button v-if="t.status === 0" class="btn-sm success" @click="submitTemplate(t.id)">{{ $t('work_pages.my_templates_btn_submit') }}</button>
          <button class="btn-sm danger" @click="confirmDelete(t)">{{ $t('work_pages.my_templates_btn_delete') }}</button>
        </div>
      </div>
    </div>

    <div v-if="!loading && !list.length" class="empty">
      <p>{{ $t('work_pages.my_templates_empty') }}</p>
      <button class="btn btn-primary" @click="goBrowse">{{ $t('work_pages.my_templates_empty_action') }}</button>
    </div>

    <Pagination v-if="total > pageSize" :page="page" :page-size="pageSize" :total="total" @change="onPageChange" />

    <Teleport to="body">
      <div class="modal-overlay" v-if="showModal" @click.self="showModal = false" @keydown.escape="showModal = false">
        <div class="modal">
          <h3>{{ $t('work_pages.my_templates_modal_title') }}</h3>
          <div class="form-group">
            <label>{{ $t('work_pages.my_templates_label_title') }}</label>
            <input v-model="editForm.title" maxlength="100" type="text" />
          </div>
          <div class="form-group">
            <label>{{ $t('work_pages.my_templates_label_content') }}</label>
            <textarea v-model="editForm.content" maxlength="5000" rows="6" :placeholder="$t('work_pages.my_templates_placeholder_content')"></textarea>
          </div>
          <div class="form-group">
            <label>{{ $t('work_pages.my_templates_label_tags') }}</label>
            <input v-model="editForm.tags" maxlength="256" type="text" :placeholder="$t('work_pages.my_templates_placeholder_tags')" />
          </div>
          <div class="form-group">
            <label>{{ $t('work_pages.my_templates_label_desc') }}</label>
            <input v-model="editForm.description" maxlength="500" type="text" :placeholder="$t('work_pages.my_templates_placeholder_desc')" />
          </div>
          <div class="modal-actions">
            <button class="btn" @click="showModal = false">{{ $t('work_pages.my_templates_btn_cancel') }}</button>
            <button class="btn btn-primary" @click="saveEdit">{{ $t('work_pages.my_templates_btn_save') }}</button>
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
  } catch (e: unknown) {
    const m = e as { data?: { msg?: string }; message?: string }
    toast.error(t('common.loadFail') + ' : ' +  (m.data?.msg || m.message || t('common.network_error')))
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
    toast.success(t('common.saved_realtime'))
    fetchData()
  } catch (e: unknown) {
    const m = e as { data?: { msg?: string }; message?: string }
    toast.error(t('common.failed_save') + ' : ' +  (m.data?.msg || m.message))
  }
}

async function submitTemplate(id: number) {
  if (!await confirm({ message: t('common.confirm_submit_review') })) return
  try {
    await $fetch(`/api/prompts/templates/${id}/submit-official`, { method: 'POST', credentials: 'include' })
    toast.success(t('common.submitted_review'))
    fetchData()
  } catch (e: unknown) {
    const m = e as { data?: { msg?: string }; message?: string }
    toast.error(t('common.failed_submit') + ' : ' +  (m.data?.msg || m.message))
  }
}

async function confirmDelete(tmpl: any) {
  if (!await confirm({ message: t('work_pages.my_templates_confirm_delete') })) return
  try {
    await $fetch(`/api/admin/prompts/${tmpl.id}`, { method: 'DELETE', credentials: 'include' })
    toast.success(t('common.delete_success'))
    fetchData()
  } catch (e: unknown) {
    const m = e as { data?: { msg?: string }; message?: string }
    toast.error(t('common.failed_delete') + ' : ' +  (m.data?.msg || m.message))
  }
}

function categoryLabel(c: string) {
  const map: Record<string, string> = {
    image: t('work_pages.my_templates_category_image'),
    text: t('work_pages.my_templates_category_text'),
    video: t('work_pages.my_templates_category_video'),
    voice: t('work_pages.my_templates_category_voice'),
    detail: t('work_pages.my_templates_category_detail'),
    main_image: t('work_pages.my_templates_category_main_image'),
    scene: t('work_pages.my_templates_category_scene'),
    copy: t('work_pages.my_templates_category_copy'),
    script: t('work_pages.my_templates_category_script'),
    'viral-clone': t('work_pages.my_templates_category_viral_clone'),
  }
  return map[c] || c
}
function statusLabel(s: number) {
  const map: Record<number, string> = {
    0: t('work_pages.my_templates_status_draft'),
    1: t('work_pages.my_templates_status_pending'),
    2: t('work_pages.my_templates_status_approved'),
    3: t('work_pages.my_templates_status_rejected'),
  }
  return map[s] || String(s)
}
function statusClass(s: number) {
  const map: Record<number, string> = { 0: 'draft', 1: 'pending', 2: 'active' }
  return map[s] || ''
}
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
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
