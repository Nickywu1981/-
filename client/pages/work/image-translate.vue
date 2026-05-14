<!-- Movio AI v5.0 — image-translate (配置驱动) -->
<template>
  <WorkPipeline :config="imageTranslateConfig" />
</template>
<script setup lang="ts">
import { imageTranslateConfig } from '@/components/work/configs/image-batch1'
import WorkPipeline from '@/components/work/pipeline/WorkPipeline.vue'
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>
