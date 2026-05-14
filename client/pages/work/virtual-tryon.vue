<!-- Movio AI v5.0 — virtual-tryon (配置驱动) -->
<template>
  <WorkPipeline :config="virtualTryonConfig" />
</template>
<script setup lang="ts">
import { virtualTryonConfig } from '@/components/work/configs/image-batch1'
import WorkPipeline from '@/components/work/pipeline/WorkPipeline.vue'
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>
