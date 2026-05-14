<!-- Movio AI v5.0 — White BG (配置驱动) -->
<template>
  <WorkPipeline :config="whiteBgConfig" />
</template>
<script setup lang="ts">
import { whiteBgConfig } from '@/components/work/configs/white-bg'
import WorkPipeline from '@/components/work/pipeline/WorkPipeline.vue'
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>
