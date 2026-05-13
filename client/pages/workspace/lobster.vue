<!-- Movio AI v6.0 — 龙虾·全链路自动化工厂（预留） -->
<template>
  <ComingSoonPlaceholder
    icon="🏭"
    :description="$t('workspace.lobster_desc')"
    :progress="10"
  />
</template>

<script setup lang="ts">
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>
