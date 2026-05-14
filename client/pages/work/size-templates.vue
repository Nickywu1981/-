<template>
  <div class="size-templates-page">
    <h1>电商平台尺寸模板</h1>
    <p class="subtitle">一键套用各大平台的图片尺寸标准，再也不用担心传错尺寸被拒</p>
    <LoadingSkeleton v-if="loading" type="card" :rows="4" />
    <div v-else-if="platformSizes.length" class="platform-grid">
      <div v-for="p in platformSizes" :key="p.platform" class="platform-card" @click="selectPlatform(p)">
        <div class="platform-card__header"><span class="platform-card__icon">{{ p.icon || '🛒' }}</span><span class="platform-card__name">{{ p.platform }}</span></div>
        <div class="platform-card__sizes">
          <div v-for="s in (p.sizes || [])" :key="s.name" class="size-item"><span class="size-item__label">{{ s.name }}</span><span class="size-item__dims">{{ s.width }}×{{ s.height || '∞' }}px</span></div>
        </div>
      </div>
    </div>
    <div v-if="selected" class="selected-platform">
      <h2>{{ selected.icon || '📐' }} {{ selected.platform }} — 尺寸详情</h2>
      <div class="size-detail-grid">
        <div v-for="s in (selected.sizes || [])" :key="s.name" class="size-detail-card" @click="useTemplate(s)">
          <div class="size-label">{{ s.name }}</div>
          <div class="size-dims">{{ s.width }}×{{ s.height || '∞' }}</div>
          <div class="size-usage">{{ s.usage || s.description || '' }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">const { t } = useI18n()

const platformSizes = ref<any[]>([])
const toast = useToast()
const selected = ref<any>(null)
const loading = ref(true)
const router = useRouter()

onMounted(async () => {
  try {
    const data: any = await $fetch('/api/templates/platforms', { credentials: 'include' })
    platformSizes.value = data?.data || []
    if (!Array.isArray(platformSizes.value)) platformSizes.value = []
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || e?.message || t('common.loadFail')) }
  loading.value = false
})

const selectPlatform = (p: any) => { selected.value = p }
const useTemplate = (s: any) => {
  router.push(`/work/main-image?w=${s.width}&h=${s.height || s.width}`)
}
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>
<style scoped>
.size-templates-page { max-width: 1200px; margin: 0 auto; padding: 40px 24px; }
h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
.subtitle { color: var(--text-secondary); margin-bottom: 32px; }
.platform-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.platform-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 12px; padding: 16px; cursor: pointer; transition: border-color .2s, transform .2s; }
.platform-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,.08); border-color: var(--brand); }
.platform-card__header { display: flex; align-items: center; gap: 8px; font-weight: 600; margin-bottom: 12px; font-size: 16px; }
.platform-card__sizes { display: flex; flex-wrap: wrap; gap: 6px; }
.size-item { background: var(--bg-page); border-radius: 6px; padding: 6px 10px; font-size: 12px; display: flex; gap: 8px; }
.size-item__label { color: var(--text-primary); font-weight: 500; }
.size-item__dims { color: var(--text-secondary); }
.selected-platform { margin-top: 32px; background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 16px; padding: 24px; }
.selected-platform h2 { margin: 0 0 16px; font-size: 18px; }
.size-detail-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.size-detail-card { background: var(--bg-page); border-radius: 10px; padding: 16px; text-align: center; cursor: pointer; transition: border-color .2s, transform .2s, box-shadow .2s; }
.size-detail-card:hover { box-shadow: 0 4px 12px rgba(124,58,237,0.1); }
.size-label { font-weight: 600; margin-bottom: 8px; }
.size-dims { font-size: 24px; font-weight: 700; color: var(--brand); }
.size-usage { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }
</style>
