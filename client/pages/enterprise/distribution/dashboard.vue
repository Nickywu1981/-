<template>
  <div class="page">
    <div class="page-header"><h1>转化数据看板</h1></div>
    <div class="stat-cards">
      <div class="stat-card"><div class="stat-num">{{ stats.clicks || 0 }}</div><div class="stat-label">总点击</div></div>
      <div class="stat-card"><div class="stat-num">{{ stats.registers || 0 }}</div><div class="stat-label">注册转化</div></div>
      <div class="stat-card"><div class="stat-num">{{ stats.rate ?? '0' }}%</div><div class="stat-label">转化率</div></div>
    </div>
    <div class="card"><h3>每日转化趋势</h3><p class="empty">数据收集中，请稍后查看</p></div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
const stats = ref({});
onMounted(async () => {
  try {
    const r = await $fetch('/api/distribution/stats', { credentials: 'include' });
    if (r.code === 200) stats.value = r.data || {};
  } catch (e) { /* ignore */ }
});
</script>
