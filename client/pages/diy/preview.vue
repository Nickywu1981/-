<template>
  <div class="diy-preview-page">
    <div v-if="loading" class="loading-skeleton">
      <div class="skeleton-bar w-60"></div>
      <div class="skeleton-block"></div>
      <div class="skeleton-block h-200"></div>
    </div>
    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button class="btn btn-outline" @click="retry">{{ $t('common.retry') }}</button>
    </div>
    <div v-else class="preview-container" :class="pageType">
      <div class="page-title-bar">
        <span>{{ page?.title || $t('diy.preview_default_title') }}</span>
        <div class="device-switch">
          <button :class="{ active: viewMode === 'mobile' }" @click="viewMode = 'mobile'" :aria-label="$t('diy.preview_mobile')">📱</button>
          <button :class="{ active: viewMode === 'pc' }" @click="viewMode = 'pc'" :aria-label="$t('diy.preview_pc')">🖥️</button>
        </div>
      </div>
      <div class="canvas-frame" :class="viewMode">
        <div v-for="section in sections" :key="section.id" class="page-section" :data-component="section.component">
          <DiySectionPreview :section="section" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">const { t } = useI18n()


const route = useRoute()
const page = ref(null)
const sections = ref([])
const error = ref('')
const loading = ref(true)
const viewMode = ref('mobile')
const pageType = computed(() => viewMode.value)

async function loadPage() {
  loading.value = true
  error.value = ''
  try {
    const rawSlug = String(route.query.slug || '')
    const slug = rawSlug.replace(/[\/\\]/g, '') || 'product-detail-demo'
    const res = await $fetch(`/api/diy/published/${slug}`)
    page.value = res?.data
    const isPC = res?.data?.page_type === 'pc'
    const config = isPC ? (res?.data?.pcConfig || res?.data?.mobileConfig) : (res?.data?.mobileConfig || res?.data?.pcConfig)
    sections.value = config?.sections || []
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string };
    error.value = t('common.failed_load_page') + ' : ' + (err?.data?.msg || err.message)
  } finally { loading.value = false }
}

function retry() { loadPage() }

onMounted(loadPage)
definePageMeta({ layout: 'landing' })
</script>

<style scoped>
.diy-preview-page { max-width: 100%; margin: 0 auto; }
.loading-skeleton { max-width: 414px; margin: 40px auto; padding: 20px; }
.skeleton-bar { height: 16px; background: var(--bg-hover); border-radius: 4px; margin-bottom: 16px; animation: shimmer 1.5s infinite; }
.skeleton-bar.w-60 { width: 60%; }
.skeleton-block { height: 100px; background: var(--bg-hover); border-radius: 8px; margin-bottom: 12px; animation: shimmer 1.5s infinite; }
.skeleton-block.h-200 { height: 200px; }
@keyframes shimmer { 0% { opacity: .5; } 50% { opacity: 1; } 100% { opacity: .5; } }
.error-state { text-align: center; padding: 80px 20px; color: var(--text-muted); }
.error-state .btn { margin-top: 16px; }
.page-title-bar { display: flex; justify-content: space-between; align-items: center; padding: 12px 24px; background: var(--bg-card); border-bottom: 1px solid var(--border-light); }
.device-switch button { padding: 6px 12px; border: 1px solid var(--border-light); background: var(--bg-card); cursor: pointer; border-radius: 4px; margin-left: 6px; }
.device-switch button.active { background: var(--brand); border-color: var(--brand); }
.canvas-frame.mobile { max-width: 414px; margin: 20px auto; border: 1px solid var(--border-light); border-radius: 16px; overflow: hidden; min-height: 600px; }
.canvas-frame.pc { max-width: 1200px; margin: 20px auto; }
.page-section { margin-bottom: 12px; }
.btn { padding: 8px 16px; border-radius: 6px; font-size: 14px; cursor: pointer; border: none; }
.btn-outline { background: var(--bg-card); border: 1px solid var(--border-light); color: var(--text-primary); }
</style>
