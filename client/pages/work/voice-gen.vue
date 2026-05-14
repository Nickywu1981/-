<!-- Movio AI v5.0 — voice-gen (配置驱动) -->
<template>
  <WorkPipeline :config="voiceGenConfig" />
</template>
<script setup lang="ts">
import { voiceGenConfig } from '@/components/work/configs/text-batch'
import WorkPipeline from '@/components/work/pipeline/WorkPipeline.vue'
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>
