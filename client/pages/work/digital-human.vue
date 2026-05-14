<!-- Movio AI v5.0 — digital-human (配置驱动) -->
<template>
  <WorkPipeline :config="digitalHumanConfig" />
</template>
<script setup lang="ts">
import { digitalHumanConfig } from '@/components/work/configs/media-batch'
import WorkPipeline from '@/components/work/pipeline/WorkPipeline.vue'
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>
