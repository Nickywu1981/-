<!-- Movio AI v5.0 — retouch (配置驱动) -->
<template>
  <WorkPipeline :config="retouchConfig" />
</template>
<script setup lang="ts">
import { retouchConfig } from '@/components/work/configs/image-batch1'
import WorkPipeline from '@/components/work/pipeline/WorkPipeline.vue'
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>
