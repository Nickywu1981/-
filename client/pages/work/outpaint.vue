<!-- Movio AI v5.0 — outpaint (配置驱动) -->
<template>
  <WorkPipeline :config="outpaintConfig" />
</template>
<script setup lang="ts">
import { outpaintConfig } from '@/components/work/configs/image-batch1'
import WorkPipeline from '@/components/work/pipeline/WorkPipeline.vue'
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>
