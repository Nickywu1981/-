<!-- Movio AI v5.0 — swap-face (配置驱动) -->
<template>
  <WorkPipeline :config="swapFaceConfig" />
</template>
<script setup lang="ts">
import { swapFaceConfig } from '@/components/work/configs/image-batch2'
import WorkPipeline from '@/components/work/pipeline/WorkPipeline.vue'
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>
