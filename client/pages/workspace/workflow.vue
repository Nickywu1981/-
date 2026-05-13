<!-- Movio AI v6.0 — 工作流（预留） -->
<template>
  <ComingSoonPlaceholder
    icon="⚙"
    :description="$t('workspace.workflow_desc')"
    :progress="20"
  />
</template>

<script setup lang="ts">
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>
