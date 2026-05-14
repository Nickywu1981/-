<!-- Movio AI v5.0 — scene (配置驱动) -->
<template>
  <WorkPipeline :config="sceneConfig" />
</template>
<script setup lang="ts">
import { sceneConfig } from '@/components/work/configs/image-batch1'
import WorkPipeline from '@/components/work/pipeline/WorkPipeline.vue'
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>
