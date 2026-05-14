<script setup lang="ts">
/** SkuSelector — 多SKU规格选择器 (颜色×尺寸×角度 矩阵) */
import { ref, computed } from 'vue'

const emit = defineEmits<{
  update: [skus: SkuRow[]]
}>()

interface SkuRow {
  id: string
  color: string
  colorHex: string
  size: string
  angle: 'front' | 'back' | 'side' | 'detail' | 'top'
}

const { t } = useI18n()

const colors = ref([
  { label: t('skuSelector.colors.white'), hex: '#FFFFFF' },
  { label: t('skuSelector.colors.black'), hex: '#000000' },
  { label: t('skuSelector.colors.red'), hex: '#DC2626' },
  { label: t('skuSelector.colors.blue'), hex: '#2563EB' },
  { label: t('skuSelector.colors.green'), hex: '#16A34A' },
  { label: t('skuSelector.colors.pink'), hex: '#EC4899' },
  { label: t('skuSelector.colors.gray'), hex: '#6B7280' },
  { label: t('skuSelector.colors.beige'), hex: '#D4A574' },
])

const sizes = ref([...'XS,S,M,L,XL,XXL'.split(','), t('skuSelector.sizes.oneSize')])

const skuMatrix = ref<SkuRow[]>([])
const selectedAngle = ref<'front' | 'back' | 'side' | 'detail' | 'top'>('front')

const totalSkus = computed(() => skuMatrix.value.length)

const toggleColor = (hex: string, label: string) => {
  const exists = skuMatrix.value.find(s => s.colorHex === hex && s.angle === selectedAngle.value)
  if (exists) {
    skuMatrix.value = skuMatrix.value.filter(s => s.colorHex !== hex || s.angle !== selectedAngle.value)
  } else {
    sizes.value.forEach(size => {
      if (!skuMatrix.value.find(s => s.colorHex === hex && s.size === size && s.angle === selectedAngle.value)) {
        skuMatrix.value.push({
          id: `${label}_${size}_${selectedAngle.value}_${Date.now()}`,
          color: label, colorHex: hex, size, angle: selectedAngle.value,
        })
      }
    })
  }
  emit('update', skuMatrix.value)
}

const isColorActive = (hex: string) => skuMatrix.value.some(s => s.colorHex === hex && s.angle === selectedAngle.value)

const removeSku = (id: string) => {
  skuMatrix.value = skuMatrix.value.filter(s => s.id !== id)
  emit('update', skuMatrix.value)
}

const clearAll = () => {
  skuMatrix.value = []
  emit('update', skuMatrix.value)
}
</script>

<template>
  <div class="ss-root">
    <div class="ss-section">
      <label class="ss-label">{{ t('skuSelector.sectionAngle') }}</label>
      <div class="ss-chips">
        <button v-for="a in (['front','back','side','detail','top'] as const)" :key="a" class="ss-chip" :class="{ sel: selectedAngle === a }" @click="selectedAngle = a">
          {{ a === 'front' ? t('skuSelector.angles.front') : a === 'back' ? t('skuSelector.angles.back') : a === 'side' ? t('skuSelector.angles.side') : a === 'detail' ? t('skuSelector.angles.detail') : t('skuSelector.angles.top') }}
        </button>
      </div>
    </div>

    <div class="ss-section">
      <label class="ss-label">{{ t('skuSelector.sectionColor') }}</label>
      <div class="ss-colors">
        <button
          v-for="c in colors" :key="c.hex"
          class="ss-color-btn"
          :class="{ sel: skuMatrix.some(s => s.colorHex === c.hex && s.angle === selectedAngle) }"
          :style="{ background: c.hex }"
          :aria-label="c.label"
          @click="toggleColor(c.hex, c.label)"
        />
      </div>
    </div>

    <div class="ss-section">
      <label class="ss-label">{{ t('skuSelector.sectionSize') }}</label>
      <div class="ss-sizes">
        <span v-for="sz in sizes" :key="sz" class="ss-size-tag">{{ sz }}</span>
      </div>
    </div>

    <div v-if="totalSkus > 0" class="ss-summary">
      <span>{{ t('skuSelector.selectedCount', { n: totalSkus }) }}</span>
      <button class="ss-clear" @click="clearAll">{{ t('skuSelector.clear') }}</button>
    </div>

    <div v-if="skuMatrix.length > 12" class="ss-matrix-preview">
      <div v-for="s in skuMatrix.slice(0, 12)" :key="s.id" class="ss-sku-mini">
        <span class="ss-sku-swatch" :style="{ background: s.colorHex }" />
        <span class="ss-sku-text">{{ s.color }} / {{ s.size }}</span>
        <button class="ss-sku-rm" @click="removeSku(s.id)">×</button>
      </div>
      <div v-if="skuMatrix.length > 12" class="ss-sku-more">+{{ skuMatrix.length - 12 }} {{ t('skuSelector.more') }}</div>
    </div>
  </div>
</template>

<style scoped>
.ss-root { padding: 16px 0; }
.ss-section { margin-bottom: 14px; }
.ss-label { display: block; font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px; }
.ss-chips { display: flex; gap: 6px; }
.ss-chip {
  padding: 4px 12px; border: 1px solid var(--border-light); border-radius: 6px;
  background: var(--bg-card); font-size: 12px; cursor: pointer; color: var(--text-secondary);
}
.ss-chip.sel { border-color: var(--brand); color: var(--brand); background: var(--brand-alpha, rgba(99,102,241,0.08)); }
.ss-colors { display: flex; gap: 8px; flex-wrap: wrap; }
.ss-color-btn {
  width: 32px; height: 32px; border-radius: 50%;
  border: 2px solid var(--border-light); cursor: pointer; position: relative;
}
.ss-color-btn.sel { border-color: var(--brand); box-shadow: 0 0 0 2px var(--brand-alpha); }
.ss-color-btn::after {
  content: ''; position: absolute; inset: -3px; border-radius: 50%; border: 1px solid rgba(0,0,0,0.08);
}
.ss-sizes { display: flex; gap: 6px; flex-wrap: wrap; }
.ss-size-tag {
  padding: 3px 10px; border-radius: 4px; background: var(--bg-card);
  font-size: 12px; color: var(--text-secondary); border: 1px solid var(--border-light);
}
.ss-summary { display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: var(--text-primary); padding: 8px 0; }
.ss-clear { border: none; background: none; color: var(--danger); font-size: 12px; cursor: pointer; }
.ss-matrix-preview { display: flex; flex-wrap: wrap; gap: 6px; }
.ss-sku-mini { display: flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 4px; background: var(--bg-card); font-size: 12px; }
.ss-sku-swatch { width: 14px; height: 14px; border-radius: 3px; border: 1px solid rgba(0,0,0,0.1); flex-shrink: 0; }
.ss-sku-text { color: var(--text-primary); }
.ss-sku-rm { border: none; background: none; cursor: pointer; color: var(--text-secondary); font-size: 14px; padding: 0 2px; }
.ss-sku-more { display: flex; align-items: center; font-size: 12px; color: var(--text-secondary); padding: 2px 8px; }
</style>
