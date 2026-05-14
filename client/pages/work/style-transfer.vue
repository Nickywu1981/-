<!-- Movio AI v5.0 — style-transfer (配置驱动) -->
<template>
  <WorkPipeline :config="styleTransferConfig" />
</template>
<script setup lang="ts">
import { styleTransferConfig } from '@/components/work/configs/image-batch1'
import WorkPipeline from '@/components/work/pipeline/WorkPipeline.vue'
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>
