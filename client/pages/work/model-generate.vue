<!-- Movio AI v5.0 — model-generate (配置驱动) -->
<template>
  <WorkPipeline :config="modelGenerateConfig" />
</template>
<script setup lang="ts">
import { modelGenerateConfig } from '@/components/work/configs/image-batch2'
import WorkPipeline from '@/components/work/pipeline/WorkPipeline.vue'
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>
