<!-- Movio AI v5.0 — viral-clone (配置驱动) -->
<template>
  <WorkPipeline :config="viralCloneConfig" />
</template>
<script setup lang="ts">
import { viralCloneConfig } from '@/components/work/configs/image-batch2'
import WorkPipeline from '@/components/work/pipeline/WorkPipeline.vue'
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>
