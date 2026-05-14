<!-- Movio AI v5.0 — video-translate (配置驱动) -->
<template>
  <WorkPipeline :config="videoTranslateConfig" />
</template>
<script setup lang="ts">
import { videoTranslateConfig } from '@/components/work/configs/media-batch'
import WorkPipeline from '@/components/work/pipeline/WorkPipeline.vue'
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>
