<!-- Movio AI v5.0 — script-gen (配置驱动) -->
<template>
  <WorkPipeline :config="scriptGenConfig" />
</template>
<script setup lang="ts">
import { scriptGenConfig } from '@/components/work/configs/text-batch'
import WorkPipeline from '@/components/work/pipeline/WorkPipeline.vue'
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>
