<template>
  <div class="page">
    <h2>{{ $t('my_pages.collections.title') }}</h2>
    <button class="btn" @click="showForm = true">{{ $t('my_pages.collections.new_btn') }}</button>

    <div v-if="showForm" class="form-card">
      <label for="coll-name">{{ $t('my_pages.collections.name_label') }}</label>
      <input id="coll-name" v-model="form.name" :placeholder="$t('my_pages.collections.name_placeholder')" />
      <label for="coll-desc">{{ $t('my_pages.collections.desc_label') }}</label>
      <input id="coll-desc" v-model="form.description" :placeholder="$t('my_pages.collections.desc_placeholder')" />
      <div class="form-actions">
        <button class="btn-outline" @click="showForm = false">{{ $t('my_pages.collections.cancel') }}</button>
        <button class="btn" @click="saveCollection" :disabled="saving">{{ saving ? $t('my_pages.collections.saving') : $t('my_pages.collections.save') }}</button>
      </div>
    </div>

    <div v-if="loading" class="loading-msg">{{ $t('my_pages.collections.loading') }}</div>

    <div v-else-if="errorMsg" class="error-box">
      <div class="error-icon">⚠️</div>
      <span>{{ errorMsg }}</span>
      <button class="btn-retry" @click="fetchData()">{{ $t('my_pages.collections.error_retry') }}</button>
    </div>

    <div v-else-if="collections.length" class="grid">
      <div v-for="c in collections" :key="c.id" class="card">
        <div class="card-cover">{{ c.name?.slice(0, 1) || '?' }}</div>
        <div class="card-name">{{ c.name }}</div>
        <div class="card-desc">{{ c.description || $t('my_pages.collections.no_desc') }}</div>
        <div class="card-meta">{{ c.item_count || 0 }} {{ $t('common.item_unit') }} · {{ c.is_public ? $t('my_pages.collections.public') : $t('my_pages.collections.private') }}</div>
        <button class="btn-del" :disabled="deleting" @click="deleteCollection(c.id)">{{ $t('my_pages.collections.delete') }}</button>
      </div>
    </div>

    <div v-else class="empty">{{ $t('my_pages.collections.empty') }}</div>

    <Pagination v-if="total > 20" :page="page" :total="total" :page-size="20" @change="(p) => { page = p; fetchData(); }" />
  </div>
</template>

<script setup lang="ts">
const { confirm } = useConfirm()
const toast = useToast()

const showForm = ref(false)
const loading = ref(true)
const saving = ref(false)
const errorMsg = ref('')
const collections = ref<any[]>([])
const page = ref(1)
const total = ref(0)
const form = reactive({ name: '', description: '' })

async function fetchData() {
  loading.value = true
  errorMsg.value = ''
  try {
    const data: any = await $fetch(`/api/collections?page=${page.value}&size=20`, { credentials: 'include' })
    collections.value = data.list || data.data?.list || []
    total.value = data.total || data.data?.total || 0
  } catch {
    errorMsg.value = t('my_pages.collections.load_failed')
  }
  loading.value = false
}

async function saveCollection() {
  if (!form.name.trim()) return toast.warn(t('my_pages.collections.name_required'))
  saving.value = true
  try {
    await $fetch('/api/collections', { method: 'POST', body: { name: form.name, description: form.description }, credentials: 'include' })
    toast.success(t('my_pages.collections.create_success'))
    showForm.value = false
    form.name = ''; form.description = ''
    fetchData()
  } catch { toast.error(t('my_pages.collections.create_failed')) }
  saving.value = false
}

const deleting = ref(false)

async function deleteCollection(id: number) {
  if (deleting.value || !await confirm({ message: t('my_pages.collections.delete_confirm') })) return
  deleting.value = true
  try {
    await $fetch(`/api/collections/${id}`, { method: 'DELETE', credentials: 'include' })
    toast.success(t('my_pages.collections.deleted'))
    fetchData()
  } catch { toast.error(t('my_pages.collections.delete_failed')) }
  finally { deleting.value = false }
}

const { t } = useI18n()
onMounted(fetchData)
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>

<style scoped>
.page { max-width: 900px; margin: 0 auto; padding: 24px; }
h2 { font-size: 20px; font-weight: 600; color: var(--text-primary); margin-bottom: 16px; }
.btn { padding: 8px 20px; border-radius: 8px; background: var(--brand-gradient, linear-gradient(135deg, #5b5fe3, #8b95ff)); color: #fff; border: none; cursor: pointer; transition: opacity .2s, transform .2s; }
.btn:hover { opacity: .9; transform: translateY(-1px); }
.btn:disabled { opacity: .6; }
.btn-outline { padding: 8px 20px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-secondary); cursor: pointer; }
.btn-outline:hover { border-color: var(--brand); color: var(--brand); }
.btn-del { padding: 4px 12px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-secondary); cursor: pointer; font-size: 13px; }
.btn-del:hover { border-color: var(--danger); color: var(--danger); }
.btn-retry { padding: 6px 16px; border-radius: 6px; border: 1px solid var(--brand); background: transparent; color: var(--brand); cursor: pointer; font-size: 13px; }
.btn-retry:hover { background: var(--brand); color: #fff; }
.form-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 12px; }
.form-card input { padding: 10px 14px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-input); color: var(--text-primary); font-size: 14px; transition: border-color .2s; }
.form-card input:focus { border-color: var(--brand); outline: none; }
.form-actions { display: flex; gap: 10px; justify-content: flex-end; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
.card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; transition: box-shadow .2s, transform .2s, border-color .2s; cursor: pointer; }
.card:hover { box-shadow: 0 4px 16px rgba(var(--brand-rgb, 91,95,227), .1); transform: translateY(-2px); border-color: var(--brand); }
.card-cover { width: 60px; height: 60px; border-radius: 12px; background: var(--brand-gradient, linear-gradient(135deg, var(--brand), color-mix(in srgb, var(--brand) 60%, white))); color: #fff; font-size: 24px; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
.card-name { font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; }
.card-desc { font-size: 13px; color: var(--text-tertiary); margin-bottom: 8px; }
.card-meta { font-size: 12px; color: var(--text-hint); margin-bottom: 12px; }
.loading-msg { text-align: center; color: var(--text-secondary); padding: 40px; }
.empty { text-align: center; color: var(--text-tertiary); padding: 60px 0; }
.error-box { display: flex; align-items: center; gap: 12px; padding: 20px; background: rgba(239,68,68,0.04); border: 1px solid rgba(239,68,68,0.2); border-radius: 10px; color: var(--text-secondary); font-size: 14px; }
.error-icon { font-size: 20px; }
</style>
