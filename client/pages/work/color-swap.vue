<!-- Movio AI v5.0 — color-swap (配置驱动) -->
<template>
  <WorkPipeline :config="colorSwapConfig" />
</template>
<script setup lang="ts">
import { colorSwapConfig } from '@/components/work/configs/image-batch2'
import WorkPipeline from '@/components/work/pipeline/WorkPipeline.vue'
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>
