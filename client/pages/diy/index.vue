<template>
  <div class="diy-page-list">
    <div class="page-header">
      <h1>{{ $t('diy.title') }}</h1>
      <div class="header-actions">
        <button class="btn btn-outline" @click="navigateTo('/work/diy-pages')" :aria-label="$t('diy.from_template')">{{ $t('diy.from_template') }}</button>
        <button class="btn btn-primary" @click="showCreate = true" :aria-label="$t('diy.new_project')">{{ $t('diy.new_project') }}</button>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <select v-model="filter.pageType" @change="loadPages">
        <option value="">{{ $t('diy.filter_all_types') }}</option>
        <option value="mobile">{{ $t('diy.type_mobile') }}</option>
        <option value="pc">{{ $t('diy.type_pc') }}</option>
        <option value="h5">{{ $t('diy.type_h5') }}</option>
      </select>
      <select v-model="filter.status" @change="loadPages">
        <option value="">{{ $t('diy.filter_all_status') }}</option>
        <option value="0">{{ $t('diy.status_draft') }}</option>
        <option value="1">{{ $t('diy.status_published') }}</option>
      </select>
      <input v-model="filter.keyword" :placeholder="$t('diy.search_placeholder')" @input="onKeywordInput" />
      <button class="btn btn-outline" @click="loadPages">{{ $t('diy.search_btn') }}</button>
    </div>

    <!-- 页面列表 -->
    <div v-if="loading" class="loading-skeleton">
      <div v-for="n in 6" :key="n" class="skeleton-card">
        <div class="skeleton-preview"></div>
        <div class="skeleton-body">
          <div class="skeleton-line w-60"></div>
          <div class="skeleton-line w-40"></div>
          <div class="skeleton-line w-30"></div>
        </div>
      </div>
    </div>
    <div v-else-if="!pages.length" class="empty">{{ $t('diy.no_projects') }}</div>
    <div v-else class="page-grid">
      <div v-for="p in pages" :key="p.id" class="page-card">
        <div class="card-preview" :class="p.page_type">
          <span class="type-badge">{{ p.page_type.toUpperCase() }}</span>
          <span class="status-badge" :class="p.status === 1 ? 'published' : 'draft'">{{ p.status === 1 ? $t('diy.status_published') : $t('diy.status_draft') }}</span>
        </div>
        <div class="card-body">
          <h3>{{ p.title }}</h3>
          <p class="slug">/diy/{{ p.slug }}</p>
          <p class="time">{{ p.update_time }}</p>
        </div>
        <div class="card-actions">
          <NuxtLink :to="`/diy/editor?id=${p.id}`" class="btn btn-sm btn-outline" :aria-label="$t('diy.edit_btn')">{{ $t('diy.edit_btn') }}</NuxtLink>
          <button v-if="p.status !== 1" class="btn btn-sm btn-primary" @click="publishPage(p.id)" :aria-label="$t('diy.publish_btn')">{{ $t('diy.publish_btn') }}</button>
          <button class="btn btn-sm btn-danger" @click="deletePage(p.id)" :aria-label="$t('diy.delete_btn')">{{ $t('diy.delete_btn') }}</button>
        </div>
      </div>
    </div>

    <!-- 新建弹窗 -->
    <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
      <div class="modal">
        <h2>{{ $t('diy.modal_title') }}</h2>
        <div class="form-group">
          <label>{{ $t('diy.label_title') }}</label>
          <input v-model="form.title" :placeholder="$t('diy.placeholder_title')" />
        </div>
        <div class="form-group">
          <label>{{ $t('diy.label_slug') }}</label>
          <input v-model="form.slug" :placeholder="$t('diy.placeholder_slug')" />
        </div>
        <div class="form-group">
          <label>{{ $t('diy.label_page_type') }}</label>
          <select v-model="form.pageType">
            <option value="mobile">{{ $t('diy.type_mobile') }}</option>
            <option value="pc">{{ $t('diy.type_pc') }}</option>
            <option value="h5">{{ $t('diy.type_h5') }}</option>
          </select>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="showCreate = false">{{ $t('diy.cancel_btn') }}</button>
          <button class="btn btn-primary" @click="createPage" :disabled="!form.title||!form.slug">{{ $t('diy.create_btn') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">const { t } = useI18n()


const { confirm } = useConfirm()

const { $api } = useNuxtApp()
const toast = useToast()
const pages = ref<DiyPage[]>([])
const loading = ref(true)
const showCreate = ref(false)
const filter = reactive({ pageType: '', status: '', keyword: '' })
const form = reactive({ title: '', slug: '', pageType: 'mobile' })
let keywordTimer: ReturnType<typeof setTimeout> | null = null

function onKeywordInput() {
  if (keywordTimer) clearTimeout(keywordTimer)
  keywordTimer = setTimeout(loadPages, 300)
}

async function loadPages() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (filter.pageType) params.set('pageType', filter.pageType)
    if (filter.status !== '') params.set('status', filter.status)
    if (filter.keyword) params.set('keyword', filter.keyword)
    const res = await $fetch(`/api/diy?${params}`)
    pages.value = res.data?.list || []
  } catch (e) { toast.error(t('common.failed_load_page_list')) }
  finally { loading.value = false }
}

async function createPage() {
  try {
    await $fetch('/api/diy', { method: 'POST', body: form })
    showCreate.value = false
    form.title = ''; form.slug = ''; form.pageType = 'mobile'
    loadPages()
  } catch (e) { toast.error(t('common.failed_create') + ' : ' +  (e?.data?.msg || e.message)) }
}

async function publishPage(id) {
  try { await $fetch(`/api/diy/${id}/publish`, { method: 'POST' }); loadPages() }
  catch (e) { toast.error(t('common.failed_submit')) }
}

async function deletePage(id) {
  if (!await confirm({ message: t('common.confirm_delete') })) return
  try { await $fetch(`/api/diy/${id}/soft-delete`, { method: 'POST' }); loadPages() }
  catch (e) { toast.error(t('common.failed_delete')) }
}

onMounted(loadPages)
onUnmounted(() => { if (keywordTimer) clearTimeout(keywordTimer) })
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>

<style scoped>
.diy-page-list { max-width: 1200px; margin: 0 auto; padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-header h1 { font-size: 24px; font-weight: 700; }
.filter-bar { display: flex; gap: 12px; margin-bottom: 24px; }
.filter-bar select, .filter-bar input { padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px; font-size: 14px; }
.page-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.page-card { border: 1px solid var(--border-light); border-radius: 10px; overflow: hidden; background: var(--bg-card); transition: box-shadow .2s; }
.page-card:hover { box-shadow: var(--shadow-card); }
.card-preview { height: 140px; background: var(--bg-hover); display: flex; align-items: flex-start; justify-content: flex-end; padding: 8px; gap: 6px; }
.card-preview.pc { background: var(--brand-light); }
.card-preview.h5 { background: var(--success-light, #e8fde8); }
.type-badge, .status-badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
.type-badge { background: var(--text-primary); color: #fff; }
.status-badge.published { background: var(--success); color: #fff; }
.status-badge.draft { background: var(--warning); color: #fff; }
.card-body { padding: 12px 16px; }
.card-body h3 { font-size: 16px; margin-bottom: 4px; }
.card-body .slug { font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }
.card-body .time { font-size: 11px; color: var(--text-muted); }
.card-actions { padding: 12px 16px; display: flex; gap: 8px; border-top: 1px solid var(--border-light); }
.empty, .loading { text-align: center; padding: 60px 20px; color: var(--text-muted); }
.loading-skeleton { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.skeleton-card { border: 1px solid var(--border-light); border-radius: 10px; overflow: hidden; }
.skeleton-preview { height: 140px; background: var(--bg-hover); animation: shimmer 1.5s infinite; }
.skeleton-body { padding: 12px 16px; }
.skeleton-line { height: 12px; background: var(--bg-hover); border-radius: 4px; margin-bottom: 8px; animation: shimmer 1.5s infinite; }
.skeleton-line.w-60 { width: 60%; }
.skeleton-line.w-40 { width: 40%; }
.skeleton-line.w-30 { width: 30%; }
@keyframes shimmer { 0% { opacity: .5; } 50% { opacity: 1; } 100% { opacity: .5; } }
.modal-overlay { position: fixed; inset: 0; background: var(--bg-overlay); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: var(--bg-card); border-radius: 12px; padding: 24px; width: 440px; max-width: 90vw; }
.modal h2 { margin-bottom: 16px; }
.form-group { margin-bottom: 14px; }
.form-group label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 4px; }
.form-group input, .form-group select { width: 100%; padding: 8px 12px; border: 1px solid var(--border-light); border-radius: 6px; font-size: 14px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
.btn { padding: 8px 16px; border-radius: 6px; font-size: 14px; cursor: pointer; border: none; }
.btn-primary { background: var(--brand); color: #fff; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-outline { background: var(--bg-card); border: 1px solid var(--border-light); color: var(--text-primary); }
.btn-danger { background: var(--bg-card); border: 1px solid var(--danger); color: var(--danger); }
.btn-sm { padding: 4px 12px; font-size: 13px; }
</style>
