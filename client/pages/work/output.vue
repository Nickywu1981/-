<!-- Movio AI v5.0 — output (配置驱动) -->
<template>
  <WorkPipeline :config="outputConfig" />
</template>
<script setup lang="ts">
import { outputConfig } from '@/components/work/configs/simple-batch'
import WorkPipeline from '@/components/work/pipeline/WorkPipeline.vue'
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>
