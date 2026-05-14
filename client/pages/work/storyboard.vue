<!-- Movio AI v5.0 — Storyboard (配置驱动) -->
<template>
  <WorkPipeline :config="storyboardConfig" />
</template>
<script setup lang="ts">
import { storyboardConfig } from '@/components/work/configs/storyboard'
import WorkPipeline from '@/components/work/pipeline/WorkPipeline.vue'
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>
