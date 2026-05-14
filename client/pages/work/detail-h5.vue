<!-- Movio AI v5.0 — detail-h5 (配置驱动) -->
<template>
  <WorkPipeline :config="detailH5Config" />
</template>
<script setup lang="ts">
import { detailH5Config } from '@/components/work/configs/simple-batch'
import WorkPipeline from '@/components/work/pipeline/WorkPipeline.vue'
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>
