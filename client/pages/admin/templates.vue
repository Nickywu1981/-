<template>
  <AdminLayout>
    <h2 class="ptitle">{{ $t('template.market') }}</h2>

    <div class="toolbar">
      <select v-model="category" class="sel" @change="search">
        <option value="">{{ $t('template.allCat') }}</option>
        <option value="ecommerce">{{ $t('template.cat_ecommerce') }}</option><option value="social">{{ $t('template.cat_social') }}</option>
        <option value="brand">{{ $t('template.cat_brand') }}</option><option value="event">{{ $t('template.cat_event') }}</option>
      </select>
      <input v-model="keyword" class="input-search" :placeholder="$t('template.searchPh')" @input="onKeywordInput" />
      <select v-model="sort" class="sel" @change="search">
        <option value="newest">{{ $t('template.sortNew') }}</option>
        <option value="download_count">{{ $t('template.sortDown') }}</option>
        <option value="rating">{{ $t('template.sortRate') }}</option>
      </select>
      <button class="btn-brand" @click="openCreate">{{ $t('template.create') }}</button>
    </div>

    <div v-if="loading" class="card-grid">
      <div v-for="i in 8" :key="i" class="card-skel pulse" />
    </div>

    <div v-else-if="error" class="error-state">
      <span class="error-icon">!</span>
      <p>{{ error }}</p>
      <button class="retry-btn" @click="search">{{ $t('common.retry') }}</button>
    </div>

    <div v-else-if="!list.length" class="empty">{{ $t('template.empty') }}</div>

    <div v-else class="card-grid">
      <div v-for="t in list" :key="t.id" class="card" @click="openDetail(t)">
        <img :src="(t.preview_images?.[0]) || '/placeholder.svg'" :alt="t.name" class="card-img" />
        <div class="card-body">
          <span class="cat-tag">{{ t.category }}</span>
          <h3 class="card-name">{{ t.name }}</h3>
          <div class="card-meta">
            <span class="stars">{{ '★'.repeat(Math.round(t.rating||0)) + '☆'.repeat(5-Math.round(t.rating||0)) }}</span>
            <span class="downloads">{{ t.download_count || 0 }} {{ $t('template.downloads') }}</span>
          </div>
          <div class="card-footer">
            <span class="price" :class="{ free: !t.price }">{{ t.price ? '¥'+t.price : $t('template.free') }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <Teleport to="body">
      <div v-if="showDetail" class="modal-overlay" @click.self="showDetail=false" @keydown.escape="showDetail=false">
        <div class="modal">
          <h3>{{ detail?.name }}</h3>
          <div class="detail-imgs">
            <img v-for="(img,i) in (detail?.preview_images||[])" :key="i" :src="img" :alt="`${detail?.name || '模板'} 预览图 ${i + 1}`" class="detail-img" />
          </div>
          <p class="detail-desc">{{ detail?.description }}</p>
          <div v-if="detail?.meta" class="detail-meta">
            <span v-for="(v,k) in parsedMeta" :key="k" class="meta-tag">{{ k }}: {{ v }}</span>
          </div>
          <div class="detail-stats">
            <span>{{ detail?.download_count || 0 }} {{ $t('template.downloads') }}</span>
            <span>{{ '★'.repeat(Math.round(detail?.rating||0)) }}</span>
            <span v-if="detail?.price">¥{{ detail.price }}</span>
            <span v-else class="free-label">{{ $t('template.free') }}</span>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" @click="showDetail=false">{{ $t('common.close') }}</button>
            <button v-if="detail?.price" class="btn-save" :disabled="acting" @click="purchase(detail)">
              {{ acting ? $t('common.processing') : $t('template.buy') }}
            </button>
            <button v-else class="btn-save" :disabled="acting" @click="download(detail)">
              {{ acting ? $t('common.processing') : $t('template.download') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Create Modal -->
    <Teleport to="body">
      <div v-if="showCreate" class="modal-overlay" @click.self="showCreate=false" @keydown.escape="showCreate=false">
        <div class="modal">
          <h3>{{ $t('template.create') }}</h3>
          <div class="form-group"><label>{{ $t('template.name') }}</label><input v-model="form.name" class="input" /></div>
          <div class="form-group"><label>{{ $t('template.cat') }}</label>
            <select v-model="form.category" class="input">
              <option value="ecommerce">{{ $t('template.cat_ecommerce') }}</option><option value="social">{{ $t('template.cat_social') }}</option>
              <option value="brand">{{ $t('template.cat_brand') }}</option><option value="event">{{ $t('template.cat_event') }}</option>
            </select>
          </div>
          <div class="form-group"><label>{{ $t('template.desc') }}</label><textarea v-model="form.description" class="input" rows="3" /></div>
          <div class="form-group"><label>{{ $t('template.previewUrl') }}</label><input v-model="form.preview_images" class="input" placeholder="https://a.jpg,https://b.jpg" /></div>
          <div class="form-group"><label>{{ $t('template.price') }}</label><input v-model.number="form.price" type="number" class="input" min="0" step="0.01" /></div>
          <div class="form-group"><label>{{ $t('template.metaJson') }}</label><textarea v-model="form.meta" class="input" rows="2" placeholder='{"size":"1080x1080"}' /></div>
          <div class="modal-actions">
            <button class="btn-cancel" @click="showCreate=false">{{ $t('common.cancel') }}</button>
            <button class="btn-save" :disabled="saving" @click="doCreate">
              {{ saving ? $t('common.saving') : $t('common.save') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </AdminLayout>
</template>

<script setup lang="ts">const { t } = useI18n()

definePageMeta({ layout: 'admin' })

const toast = useToast()
const list = ref<any[]>([]), loading = ref(true), error = ref('')
const keyword = ref(''), category = ref(''), sort = ref('newest')
const showDetail = ref(false), detail = ref<any>(null), acting = ref(false)
const showCreate = ref(false), saving = ref(false)
const form = reactive({ name: '', category: 'ecommerce', description: '', preview_images: '', price: 0, meta: '' })

const parsedMeta = computed(() => {
  if (!detail.value?.meta) return {}
  if (typeof detail.value.meta === 'string') { try { return JSON.parse(detail.value.meta) } catch { return {} } }
  return detail.value.meta
})

let debounceTimer: ReturnType<typeof setTimeout>
function onKeywordInput() { clearTimeout(debounceTimer); debounceTimer = setTimeout(search, 350) }

onMounted(search)
async function search() {
  loading.value = true; error.value = ''
  try {
    const q = new URLSearchParams({ category: category.value, keyword: keyword.value, sort: sort.value, page: '1', pageSize: '40' })
    const res: any = await $fetch(`/api/template-market/search?${q}`, { credentials: 'include' })
    list.value = res?.data?.list || res?.list || []
  } catch (e: unknown) { error.value = e?.data?.msg || e.message || t('common.loadFail') }
  loading.value = false
}

async function openDetail(t: any) {
  showDetail.value = true; detail.value = t
  try { detail.value = await $fetch(`/api/template-market/${t.id}`, { credentials: 'include' }) } catch { /* card data fallback */ }
}

async function download(t: any) {
  acting.value = true
  try { await $fetch(`/api/template-market/${t.id}/download`, { method: 'POST', credentials: 'include' }); toast.success(t('template.dlOk')) }
catch (e: unknown){
    const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || t('template.dlFail')) }
  acting.value = false
}

async function purchase(t: any) {
  acting.value = true
  try { await $fetch(`/api/template-market/${t.id}/purchase`, { method: 'POST', credentials: 'include' }); toast.success(t('template.buyOk')); search() }
catch (e: unknown){
    const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || t('template.buyFail')) }
  acting.value = false
}

function openCreate() {
  Object.assign(form, { name: '', category: 'ecommerce', description: '', preview_images: '', price: 0, meta: '' })
  showCreate.value = true
}

async function doCreate() {
  saving.value = true
  try {
    const body = {
      name: form.name, category: form.category, description: form.description,
      preview_images: form.preview_images.split(',').map((s: string) => s.trim()).filter(Boolean),
      price: form.price, meta: (() => { try { return JSON.parse(form.meta) } catch { return {} } })()
    }
    await $fetch('/api/template-market/create', { method: 'POST', credentials: 'include', body: JSON.stringify(body) })
    showCreate.value = false; search(); toast.success(t('template.created'))
  } catch (e: unknown) { toast.error(e?.data?.msg || t('template.createFail')) }
  saving.value = false
}
</script>

<style scoped>
.ptitle { font-size: 20px; font-weight: 700; color: var(--text-primary); margin-bottom: 20px; }
.toolbar { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }

.input-search { flex: 1; min-width: 160px; max-width: 280px; padding: 7px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; transition: border-color .15s; }
.input-search:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }

.sel { padding: 7px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--bg-card); color: var(--text-primary); outline: none; }
.sel:focus { border-color: var(--input-focus-border); }

.btn-brand { padding: 7px 18px; background: var(--brand); color: var(--text-on-brand); border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; white-space: nowrap; transition: opacity .15s; }
.btn-brand:hover { opacity: .88; }

.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
.card { background: var(--bg-card); border: 1px solid var(--border-card); border-radius: var(--radius-lg); overflow: hidden; cursor: pointer; transition: transform .15s, box-shadow .15s; }
.card:hover { transform: translateY(-2px); box-shadow: var(--shadow-sm); }
.card-img { width: 100%; height: 180px; object-fit: cover; background: var(--skeleton-bg); }
.card-body { padding: 12px; }
.cat-tag { display: inline-block; padding: 2px 8px; border-radius: var(--radius-xs); font-size: 11px; background: var(--status-processing-bg); color: var(--status-processing-text); margin-bottom: 6px; }
.card-name { font-size: 14px; font-weight: 600; color: var(--text-primary); margin: 0 0 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-meta { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted); margin-bottom: 8px; }
.stars { color: var(--warning); letter-spacing: 1px; }
.card-footer { display: flex; justify-content: space-between; align-items: center; }
.price { font-size: 15px; font-weight: 700; color: var(--brand); }
.price.free { color: var(--success); }

.card-skel { height: 280px; border-radius: var(--radius-lg); background: var(--skeleton-bg); }
.pulse { animation: sk-pulse 1.5s ease-in-out infinite; }
@keyframes sk-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }

.error-state { text-align: center; padding: 60px 20px; }
.error-icon { display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: var(--radius-full); background: var(--status-fail-bg); color: var(--status-fail-text); font-size: 22px; font-weight: 700; margin-bottom: 12px; }
.error-state p { color: var(--text-muted); margin: 0 0 16px; font-size: 14px; }
.retry-btn { padding: 8px 20px; background: var(--brand); color: var(--text-on-brand); border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; }
.empty { text-align: center; color: var(--text-muted); padding: 60px 20px; font-size: 14px; }

.modal-overlay { position: fixed; inset: 0; background: var(--modal-overlay); z-index: 5000; display: flex; align-items: center; justify-content: center; }
.modal { background: var(--bg-card); border-radius: var(--modal-radius); padding: var(--modal-padding); width: 90%; max-width: 600px; max-height: 85vh; overflow-y: auto; box-shadow: var(--modal-shadow); }
.modal h3 { font-size: 17px; font-weight: 600; margin: 0 0 16px; color: var(--text-primary); }
.detail-imgs { display: flex; gap: 8px; overflow-x: auto; margin-bottom: 14px; }
.detail-img { width: 140px; height: 100px; object-fit: cover; border-radius: var(--radius-sm); border: 1px solid var(--border-light); flex-shrink: 0; }
.detail-desc { font-size: 13px; color: var(--text-secondary); margin: 0 0 12px; line-height: 1.6; }
.detail-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
.meta-tag { padding: 2px 8px; border-radius: var(--radius-xs); font-size: 11px; background: var(--bg-secondary); color: var(--text-muted); border: 1px solid var(--border-light); }
.detail-stats { display: flex; gap: 14px; font-size: 13px; color: var(--text-secondary); margin-bottom: 16px; padding: 10px 0; border-top: 1px solid var(--border-light); border-bottom: 1px solid var(--border-light); }
.free-label { color: var(--success); font-weight: 600; }

.form-group { margin-bottom: 10px; }
.form-group label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 4px; }
.form-group .input { width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; resize: vertical; }
.form-group .input:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
.btn-cancel { padding: 8px 20px; border: 1px solid var(--border-card); border-radius: var(--radius-sm); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 13px; }
.btn-cancel:hover { border-color: var(--text-muted); }
.btn-save { padding: 8px 20px; background: var(--brand); color: var(--text-on-brand); border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; }
.btn-save:hover { opacity: .88; }
.btn-save:disabled { opacity: .5; cursor: not-allowed; }

@media (max-width: 640px) {
  .card-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .card-img { height: 140px; }
  .toolbar { flex-direction: column; }
  .input-search { max-width: 100%; }
}
</style>
