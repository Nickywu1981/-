<template>
  <div class="wp">
    <div class="wp-card">
      <div class="wp-icon">{{ icon }}</div>
      <h2>{{ $t('workspace.coming_soon_title') }}</h2>
      <p>{{ description }}</p>
      <p class="wp-detail">{{ $t('workspace.coming_soon_detail') }}</p>
      <div class="wp-progress">
        <div class="wp-progress-bar">
          <div class="wp-progress-fill" :style="{ width: progress + '%' }"></div>
        </div>
        <span class="wp-progress-label">{{ $t('workspace.progress_label') }} {{ progress }}%</span>
      </div>
      <button class="wp-btn">{{ $t('workspace.reserve_btn') }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  icon: string
  description: string
  progress: number
}>()
</script>

<style scoped>
.wp { display: flex; align-items: center; justify-content: center; min-height: 60vh; padding: 40px; }
.wp-card { text-align: center; max-width: 520px; }
.wp-icon { font-size: 52px; margin-bottom: 16px; }
.wp-card h2 { font-size: 20px; font-weight: 500; color: var(--tx, #171717); margin-bottom: 12px; }
.wp-card p { font-size: 14px; color: var(--tx2, #6b6b70); line-height: 1.7; margin-bottom: 10px; }
.wp-detail { font-size: 13px !important; color: var(--tx3, #9d9da3) !important; margin-bottom: 20px !important; }
.wp-progress { display: flex; align-items: center; gap: 12px; justify-content: center; margin-bottom: 22px; }
.wp-progress-bar { width: 200px; height: 6px; border-radius: 3px; background: var(--bg-tag, #f3f4f6); overflow: hidden; }
.wp-progress-fill { height: 100%; border-radius: 3px; background: var(--brand, #5b5fe3); transition: width 0.6s; }
.wp-progress-label { font-size: 12px; color: var(--tx3, #9d9da3); }
.wp-btn {
  padding: 9px 28px; border-radius: 8px; font-size: 13px; font-weight: 500; border: none;
  background: var(--brand, #5b5fe3); color: #fff; cursor: pointer; transition: opacity 0.15s, transform 0.15s;
}
.wp-btn:hover { opacity: 0.9; transform: translateY(-1px); }
.wp-btn:focus-visible { outline: 2px solid var(--brand, #5b5fe3); outline-offset: 2px; }

/* Dark mode */
:root[data-theme="dark"] .wp-card h2, :root.dark .wp-card h2 { color: #e5e5e5; }
:root[data-theme="dark"] .wp-card p, :root.dark .wp-card p { color: #9d9da3; }
:root[data-theme="dark"] .wp-detail, :root.dark .wp-detail { color: #7d7d83 !important; }
:root[data-theme="dark"] .wp-progress-bar, :root.dark .wp-progress-bar { background: #2a2a2a; }
</style>
