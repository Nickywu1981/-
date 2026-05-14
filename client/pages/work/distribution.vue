<!-- Movio AI v5.0 — distribution (配置驱动) -->
<template>
  <WorkPipeline :config="distributionConfig" />
</template>
<script setup lang="ts">
import { distributionConfig } from '@/components/work/configs/simple-batch'
import WorkPipeline from '@/components/work/pipeline/WorkPipeline.vue'
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>
