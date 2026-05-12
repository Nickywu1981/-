<!--
  PageHeader — 页面头部组件
  Props: title / subtitle / backRoute / backLabel
  Slots: actions (右侧操作按钮)
-->
<template>
  <div class="page-header">
    <div class="ph-left">
      <button v-if="backRoute" class="ph-back" @click="goBack">
        ← {{ backLabel || '返回' }}
      </button>
      <div>
        <h1 class="ph-title">{{ title }}</h1>
        <p v-if="subtitle" class="ph-subtitle">{{ subtitle }}</p>
      </div>
    </div>
    <div v-if="$slots.actions" class="ph-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  backRoute?: string
  backLabel?: string
}>()

const router = useRouter()
function goBack() { router.back() }
</script>

<style scoped>
.page-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: var(--space-6, 24px); flex-wrap: wrap; gap: 12px;
}
.ph-left { display: flex; align-items: flex-start; gap: 12px; }
.ph-back {
  background: none; border: 1px solid #dcdfe6; color: #606266; padding: 4px 12px;
  border-radius: 6px; cursor: pointer; font-size: 13px; white-space: nowrap; margin-top: 4px;
}
.ph-back:hover { border-color: #409eff; color: #409eff; }
.ph-title { margin: 0; font-size: 22px; font-weight: 700; color: #303133; }
.ph-subtitle { margin: 4px 0 0; font-size: 14px; color: #909399; }
.ph-actions { display: flex; gap: 8px; align-items: center; }
</style>
