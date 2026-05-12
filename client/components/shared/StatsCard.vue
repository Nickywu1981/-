<!--
  StatsCard — 统计卡片组件
  Props: value / label / trend / trendUp / icon / color
  适用: Dashboard KPI 卡片、数据概览
-->
<template>
  <div class="stat-card" :style="{ borderTopColor: color || 'var(--accent, #409eff)' }">
    <div class="stat-card-top">
      <span v-if="icon" class="stat-card-icon">{{ icon }}</span>
      <span class="stat-card-value">{{ value }}</span>
    </div>
    <div class="stat-card-label">{{ label }}</div>
    <div v-if="trend" class="stat-card-trend" :class="trendUp ? 'up' : 'down'">
      {{ trendUp ? '↑' : '↓' }} {{ trend }}
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  value: string | number
  label: string
  trend?: string
  trendUp?: boolean
  icon?: string
  color?: string
}>()
</script>

<style scoped>
.stat-card {
  padding: 20px;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-top: 3px solid #409eff;
  border-radius: 10px;
  transition: box-shadow .2s;
}
.stat-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,.06); }
.stat-card-top { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.stat-card-icon { font-size: 24px; }
.stat-card-value { font-size: 28px; font-weight: 700; color: #303133; }
.stat-card-label { font-size: 13px; color: #909399; }
.stat-card-trend { font-size: 12px; margin-top: 6px; }
.stat-card-trend.up { color: #67c23a; }
.stat-card-trend.down { color: #f56c6c; }
</style>
