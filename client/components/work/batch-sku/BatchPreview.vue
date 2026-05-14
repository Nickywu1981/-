<script setup lang="ts">
/** BatchPreview — 批量生成结果预览网格 */
import { computed } from 'vue'

interface BatchResult {
  sku: { color?: string; size?: string; angle?: string }
  platform: string
  type?: string
  size?: { width: number; height: number }
  url?: string
  status: 'done' | 'failed' | 'pending'
  error?: string
}

const props = defineProps<{
  results: BatchResult[]
  totalCount: number
  completedCount: number
}>()

const { t } = useI18n()

const progress = computed(() =>
  props.totalCount > 0 ? Math.round((props.completedCount / props.totalCount) * 100) : 0,
)

const platformLabels: Record<string, string> = {
  taobao: t('platforms.taobao'), pinduoduo: t('platforms.pinduoduo'), douyin: t('platforms.douyin'), xiaohongshu: t('platforms.xiaohongshu'),
  amazon: t('platforms.amazon'), shopee: t('platforms.shopee'), lazada: t('platforms.lazada'), temu: t('platforms.temu'), shein: t('platforms.shein'),
  tiktok_shop: t('platforms.tiktok'), tiktok: t('platforms.tiktok'), youtube: t('platforms.youtube'),
}

const typeLabels: Record<string, string> = {
  main: t('batchPreview.types.main'), white_bg: t('batchPreview.types.white_bg'), scene: t('batchPreview.types.scene'), render: t('batchPreview.types.render'),
}
</script>

<template>
  <div class="bp-root">
    <div v-if="totalCount > 0" class="bp-progress">
      <div class="bp-bar"><div class="bp-fill" :style="{ width: progress + '%' }" /></div>
      <span class="bp-pct">{{ completedCount }} / {{ totalCount }}</span>
    </div>

    <div class="bp-grid">
      <div
        v-for="(r, i) in results"
        :key="i"
        class="bp-card"
        :class="{ failed: r.status === 'failed' }"
      >
        <div v-if="r.url" class="bp-img-wrap">
          <img :src="r.url" :alt="`${r.sku?.color || ''} - ${r.platform}`" class="bp-img" />
          <span class="bp-size-tag">{{ r.size?.width }}×{{ r.size?.height }}</span>
        </div>
        <div v-else-if="r.status === 'failed'" class="bp-error">
          {{ t('batchPreview.generateFailed') }}
        </div>
        <div v-else class="bp-pending">
          <span class="bp-spinner" />
        </div>
        <div class="bp-meta">
          <span class="bp-platform">{{ platformLabels[r.platform] || r.platform }}</span>
          <span v-if="r.type" class="bp-type">{{ typeLabels[r.type] || r.type }}</span>
          <span class="bp-sku-tag">{{ r.sku?.color || '' }} {{ r.sku?.size || '' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bp-root { padding: 16px 0; }
.bp-progress { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.bp-bar { flex: 1; height: 6px; border-radius: 3px; background: var(--bg-card); overflow: hidden; }
.bp-fill { height: 100%; background: var(--brand); border-radius: 3px; transition: width 0.3s; }
.bp-pct { font-size: 13px; font-weight: 600; color: var(--text-primary); min-width: 70px; }
.bp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
.bp-card {
  border: 1px solid var(--border-light); border-radius: var(--radius-md, 8px);
  overflow: hidden; background: var(--bg-card);
}
.bp-card.failed { border-color: rgba(239,68,68,0.3); }
.bp-img-wrap { position: relative; aspect-ratio: 1; overflow: hidden; background: var(--bg-page); }
.bp-img { width: 100%; height: 100%; object-fit: cover; }
.bp-size-tag {
  position: absolute; bottom: 4px; right: 4px;
  padding: 1px 6px; border-radius: 3px; background: rgba(0,0,0,0.6);
  color: #fff; font-size: 10px;
}
.bp-error { display: flex; align-items: center; justify-content: center; height: 100px; font-size: 13px; color: var(--danger); }
.bp-pending {
  display: flex; align-items: center; justify-content: center; height: 100px;
}
.bp-spinner {
  width: 24px; height: 24px; border: 2px solid var(--border-light);
  border-top-color: var(--brand); border-radius: 50%;
  animation: bp-spin 0.8s linear infinite;
}
@keyframes bp-spin { to { transform: rotate(360deg); } }
.bp-meta { padding: 6px 8px; display: flex; flex-wrap: wrap; gap: 4px; }
.bp-platform { font-size: 11px; font-weight: 600; color: var(--brand); }
.bp-type { font-size: 11px; color: var(--text-secondary); }
.bp-sku-tag { font-size: 11px; color: var(--text-secondary); }
</style>
