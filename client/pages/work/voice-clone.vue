<!-- Movio AI v5.0 — voice-clone (配置驱动) -->
<template>
  <WorkPipeline :config="voiceCloneConfig" />
</template>
<script setup lang="ts">
import { voiceCloneConfig } from '@/components/work/configs/media-batch'
import WorkPipeline from '@/components/work/pipeline/WorkPipeline.vue'
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>
