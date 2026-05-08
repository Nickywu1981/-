<template>
  <div class="skeleton-wrap">
    <div v-if="type === 'table'" class="sk-table">
      <div v-for="i in rows" :key="i" class="sk-row">
        <div v-for="j in cols" :key="j" class="sk-cell pulse" :style="{ width: randomW(i, j) }" />
      </div>
    </div>
    <div v-else-if="type === 'card'" class="sk-cards">
      <div v-for="i in count" :key="i" class="sk-card pulse" />
    </div>
    <div v-else class="sk-block pulse" :style="{ height: height || '120px' }" />
  </div>
</template>

<script setup lang="ts">
defineProps<{ type?: string; rows?: number; cols?: number; count?: number; height?: string }>()
const _widths = ['60%', '80%', '40%', '95%', '55%', '70%', '35%', '90%', '50%', '75%']
function randomW(i: number, j: number) { return _widths[(i * 3 + j * 7) % _widths.length] }
</script>

<style scoped>
.skeleton-wrap { padding: 12px 0; }
.sk-table { display: flex; flex-direction: column; gap: 8px; }
.sk-row { display: flex; gap: 12px; }
.sk-cell { height: 16px; border-radius: var(--radius-xs); background: var(--skeleton-bg); }
.sk-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
.sk-card { height: 160px; border-radius: var(--radius-lg); background: var(--skeleton-bg); }
.sk-block { border-radius: var(--radius-lg); background: var(--skeleton-bg); }
.pulse { animation: sk-pulse 1.5s ease-in-out infinite; }
@keyframes sk-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }
</style>
