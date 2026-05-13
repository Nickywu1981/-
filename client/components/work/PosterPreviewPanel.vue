<template>
  <div class="preview-panel">
    <!-- Placeholder -->
    <div v-if="!results.length && !generating && !error" class="preview-placeholder">
      <div class="placeholder-icon">🖼️</div>
      <p>{{ $t('poster_preview.placeholder') }}</p>
    </div>

    <!-- Loading -->
    <div v-if="generating" class="generating-state">
      <div class="generating-skeleton" :style="{ aspectRatio: size.ratio.replace(':', '/') }"></div>
      <p class="generating-text">{{ statusText }}</p>
    </div>

    <!-- Results -->
    <div v-if="results.length" class="results-grid">
      <div
        v-for="(item, idx) in results"
        :key="idx"
        class="result-card"
        :style="{ aspectRatio: size.ratio.replace(':', '/') }"
      >
        <img
          v-if="item.url"
          loading="lazy"
          :src="item.url"
          :alt="$t('poster_preview.result_alt', { idx: idx + 1 })"
          class="result-img"
          @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }"
        />
        <div v-else class="result-placeholder">{{ $t('poster_preview.generating') }}</div>
        <div class="result-actions">
          <button class="btn-icon" :title="$t('poster_preview.download')" :aria-label="$t('poster_preview.download')" @click="$emit('download', item.url)">⬇</button>
          <button class="btn-icon" :title="$t('poster_preview.copy')" :aria-label="$t('poster_preview.copy')" @click="$emit('copy', item.url)">📋</button>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="error-state">
      <p>{{ error }}</p>
      <button class="btn btn-outline" @click="$emit('retry')">重试</button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  results: { url: string }[]
  generating: boolean
  error: string
  statusText: string
  size: { ratio: string }
}>(), {
  results: () => [],
  generating: false,
  error: '',
  statusText: '',
  size: () => ({ ratio: '1:1' }),
})

defineEmits<{
  retry: []
  download: [url: string]
  copy: [url: string]
}>()
</script>

<style scoped>
.preview-panel { min-height: 400px; }
.preview-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 400px; color: var(--text-tertiary); border: 2px dashed var(--border-color); border-radius: 12px; }
.placeholder-icon { font-size: 48px; margin-bottom: 12px; }

.generating-state { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 60px 0; }
.generating-skeleton { width: 100%; height: 300px; background: linear-gradient(90deg, var(--bg-card) 25%, var(--bg-hover) 50%, var(--bg-card) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 12px; }
.generating-text { color: var(--text-secondary); font-size: 14px; }

.results-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px; }
.result-card { position: relative; border-radius: 12px; overflow: hidden; background: var(--bg-card); border: 1px solid var(--border-color); }
.result-img { width: 100%; height: 100%; object-fit: cover; }
.result-placeholder { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-tertiary); }
.result-actions { position: absolute; bottom: 8px; right: 8px; display: flex; gap: 4px; opacity: 0; transition: opacity 0.2s; }
.result-card:hover .result-actions { opacity: 1; }
.btn-icon { width: 32px; height: 32px; border-radius: 6px; border: none; background: rgba(0,0,0,0.6); color: #fff; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; }

.error-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 0; color: var(--text-secondary); }
.btn { padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; display: flex; align-items: center; gap: 6px; transition: background 0.2s, opacity 0.2s; }
.btn-outline { background: transparent; border: 1px solid var(--border-color); color: var(--text-primary); }

@keyframes shimmer { to { background-position: -200% 0; } }
</style>
