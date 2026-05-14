<!-- Movio AI v8.0 — 历史记录 -->
<template>
  <ComingSoonPlaceholder
    icon="📋"
    :description="$t('workspace.history_desc')"
    :progress="15"
  />
</template>

<script setup lang="ts">
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>
