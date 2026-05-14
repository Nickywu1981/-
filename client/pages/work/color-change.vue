<!-- Movio AI v5.0 — Color Change (配置驱动) -->
<template>
  <WorkPipeline :config="colorChangeConfig" />
</template>
<script setup lang="ts">
import { colorChangeConfig } from '@/components/work/configs/color-change'
import WorkPipeline from '@/components/work/pipeline/WorkPipeline.vue'
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>
