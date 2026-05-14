<!-- Movio AI v5.0 — video-edit (配置驱动) -->
<template>
  <WorkPipeline :config="videoEditConfig" />
</template>
<script setup lang="ts">
import { videoEditConfig } from '@/components/work/configs/media-batch'
import WorkPipeline from '@/components/work/pipeline/WorkPipeline.vue'
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>
