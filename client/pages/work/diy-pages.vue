<!-- Movio AI v5.0 — diy-pages (配置驱动) -->
<template>
  <WorkPipeline :config="diyPagesConfig" />
</template>
<script setup lang="ts">
import { diyPagesConfig } from '@/components/work/configs/simple-batch'
import WorkPipeline from '@/components/work/pipeline/WorkPipeline.vue'
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>
