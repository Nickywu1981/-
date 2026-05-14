<!-- Movio AI v5.0 — prompt-hub (配置驱动) -->
<template>
  <WorkPipeline :config="promptHubConfig" />
</template>
<script setup lang="ts">
import { promptHubConfig } from '@/components/work/configs/text-batch'
import WorkPipeline from '@/components/work/pipeline/WorkPipeline.vue'
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>
