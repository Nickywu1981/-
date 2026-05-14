<!-- Movio AI v5.0 — usage (配置驱动) -->
<template>
  <WorkPipeline :config="usageConfig" />
</template>
<script setup lang="ts">
import { usageConfig } from '@/components/work/configs/simple-batch'
import WorkPipeline from '@/components/work/pipeline/WorkPipeline.vue'
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>
