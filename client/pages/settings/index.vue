<!-- Movio AI — 账号设置 (Account Settings) 页面框架 -->
<template>
  <div class="page-container">
    <header class="page-header">
      <h1>{{ $t('settings.title') }}</h1>
      <p>{{ $t('settings.subtitle') }}</p>
    </header>
    <div class="placeholder-card">
      <span class="ph-icon">⚙</span>
      <p>{{ $t('settings.coming_soon') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>

<style scoped>
.page-container { max-width: 800px; margin: 0 auto; padding: var(--cfg-spacing-xl) var(--cfg-spacing-base); }
.page-header { text-align: center; margin-bottom: 28px; }
.page-header h1 { font-size: var(--cfg-font-size-2xl); margin: 0 0 6px; }
.page-header p { color: var(--cfg-text-muted); }
.placeholder-card { text-align: center; padding: 60px 20px; border: 2px dashed var(--cfg-border); border-radius: var(--cfg-radius-lg); }
.ph-icon { font-size: 48px; display: block; margin-bottom: 16px; }
.placeholder-card p { color: var(--cfg-text-muted); font-size: var(--cfg-font-size-base); }
</style>
