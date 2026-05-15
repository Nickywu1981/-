<!-- Movio AI — 我的积分 (My Credits) 页面框架 -->
<template>
  <div class="page-container">
    <header class="page-header">
      <h1>{{ $t('credits.title') }}</h1>
      <p>{{ $t('credits.subtitle') }}</p>
    </header>
    <div class="placeholder-card">
      <span class="ph-icon">🪙</span>
      <p>{{ $t('credits.coming_soon') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>

<style scoped>
.page-container { max-width: 800px; margin: 0 auto; padding: var(--space-8, 32px) var(--space-4, 16px); }
.page-header { text-align: center; margin-bottom: 28px; }
.page-header h1 { font-size: var(--text-2xl, 1.5rem); margin: 0 0 6px; }
.page-header p { color: var(--text-muted, #9ca3af); }
.placeholder-card { text-align: center; padding: 60px 20px; border: 2px dashed var(--border-color, #e5e7eb); border-radius: var(--radius-lg, 12px); }
.ph-icon { font-size: 48px; display: block; margin-bottom: 16px; }
.placeholder-card p { color: var(--text-muted, #9ca3af); font-size: var(--text-base, 1rem); }
</style>
