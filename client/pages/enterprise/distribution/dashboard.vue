<template>
  <div class="page">
    <div class="page-header"><h1>转化数据看板</h1></div>
    <div v-if="loading" class="empty">加载中...</div>
    <div v-else-if="error" class="error-msg">{{ error }} <button class="btn-text" @click="loadStats">重试</button></div>
    <template v-else>
    <div class="stat-cards">
      <div class="stat-card"><div class="stat-num">{{ stats.clicks || 0 }}</div><div class="stat-label">总点击</div></div>
      <div class="stat-card"><div class="stat-num">{{ stats.registers || 0 }}</div><div class="stat-label">注册转化</div></div>
      <div class="stat-card"><div class="stat-num">{{ stats.rate ?? '0' }}%</div><div class="stat-label">转化率</div></div>
    </div>
    <div class="card"><h3>每日转化趋势</h3><p class="empty">数据收集中，请稍后查看</p></div>
    </template>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'enterprise' });
import { ref, onMounted } from 'vue';
const stats = ref({});
const loading = ref(true);
const error = ref('');

async function loadStats() {
  loading.value = true; error.value = '';
  try {
    const r = await $fetch('/api/distribution/stats', { credentials: 'include' });
    if (r.code === 200) stats.value = r.data || {};
  } catch (e) { error.value = e?.data?.msg || '加载失败'; }
  finally { loading.value = false; }
}
onMounted(loadStats);
</script>
