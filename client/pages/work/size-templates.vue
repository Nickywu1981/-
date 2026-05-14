<!-- Movio AI v5.0 — size-templates (配置驱动) -->
<template>
  <WorkPipeline :config="sizeTemplatesConfig" />
</template>
<script setup lang="ts">
import { sizeTemplatesConfig } from '@/components/work/configs/simple-batch'
import WorkPipeline from '@/components/work/pipeline/WorkPipeline.vue'
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>
