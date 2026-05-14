<!-- Movio AI v5.0 — poster (配置驱动) -->
<template>
  <WorkPipeline :config="posterConfig" />
</template>
<script setup lang="ts">
import { posterConfig } from '@/components/work/configs/image-batch2'
import WorkPipeline from '@/components/work/pipeline/WorkPipeline.vue'
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>
