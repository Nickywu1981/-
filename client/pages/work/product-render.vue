<!-- Movio AI v5.0 — product-render (配置驱动) -->
<template>
  <WorkPipeline :config="productRenderConfig" />
</template>
<script setup lang="ts">
import { productRenderConfig } from '@/components/work/configs/image-batch1'
import WorkPipeline from '@/components/work/pipeline/WorkPipeline.vue'
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>
