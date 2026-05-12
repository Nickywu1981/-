<!-- 响应式网格布局 — 自动适配列数，支持间距与对齐 -->
<template>
  <div class="responsive-grid" :style="gridStyle">
    <div
      v-for="(item, idx) in items"
      :key="(item as any).id ?? (item as any).key ?? idx"
      class="responsive-grid__item"
      :style="itemStyle"
    >
      <slot name="item" :item="item" :index="idx" />
    </div>
    <div v-if="$slots.empty && items.length === 0" class="responsive-grid__empty">
      <slot name="empty" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ items?: any[] }>()

const attrs = useAttrs()
const cols = computed(() => ({
  xs: Number(attrs.colsXs) || 1,
  sm: Number(attrs.colsSm) || 2,
  md: Number(attrs.colsMd) || 3,
  lg: Number(attrs.colsLg) || 4,
  xl: Number(attrs.colsXl) || 5,
}))
const gap = computed(() => attrs.gap || '16px')

const breakpoints = { xs: '480px', sm: '768px', md: '1024px', lg: '1280px', xl: '1600px' }

const gridStyle = computed(() => {
  let tpl = `repeat(${cols.value.xs}, 1fr)`
  const queries: string[] = []
  for (const bp of ['sm', 'md', 'lg', 'xl'] as const) {
    queries.push(`@media (min-width: ${breakpoints[bp]}) { display: grid; grid-template-columns: repeat(${cols.value[bp]}, 1fr); }`)
  }
  return { gap: gap.value, gridTemplateColumns: tpl }
})

const itemStyle = computed(() => ({ minWidth: 0 }))
</script>

<style scoped>
.responsive-grid {
  display: grid;
  width: 100%;
}
.responsive-grid__item { overflow: hidden; }
.responsive-grid__empty {
  grid-column: 1 / -1;
  padding: 48px 0;
  text-align: center;
  color: var(--el-text-color-secondary);
}

@media (min-width: 480px)  { .responsive-grid { grid-template-columns: repeat(v-bind('cols.sm'), 1fr); } }
@media (min-width: 768px)  { .responsive-grid { grid-template-columns: repeat(v-bind('cols.md'), 1fr); } }
@media (min-width: 1024px) { .responsive-grid { grid-template-columns: repeat(v-bind('cols.lg'), 1fr); } }
@media (min-width: 1280px) { .responsive-grid { grid-template-columns: repeat(v-bind('cols.xl'), 1fr); } }
</style>
