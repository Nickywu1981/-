<!-- Movio AI v5.0 — viral-replicate (配置驱动) -->
<template>
  <WorkPipeline :config="viralReplicateConfig" />
</template>
<script setup lang="ts">
import { viralReplicateConfig } from '@/components/work/configs/image-batch2'
import WorkPipeline from '@/components/work/pipeline/WorkPipeline.vue'
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>
