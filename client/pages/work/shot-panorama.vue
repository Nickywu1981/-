<!-- Movio AI v5.0 — shot-panorama (配置驱动) -->
<template>
  <WorkPipeline :config="shotPanoramaConfig" />
</template>
<script setup lang="ts">
import { shotPanoramaConfig } from '@/components/work/configs/text-batch'
import WorkPipeline from '@/components/work/pipeline/WorkPipeline.vue'
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>
