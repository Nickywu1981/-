<!-- Movio AI v5.0 — main-image (配置驱动) -->
<template>
  <WorkPipeline :config="mainImageConfig" />
</template>
<script setup lang="ts">
import { mainImageConfig } from '@/components/work/configs/image-batch1'
import WorkPipeline from '@/components/work/pipeline/WorkPipeline.vue'
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>
