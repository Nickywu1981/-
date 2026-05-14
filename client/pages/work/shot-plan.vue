<!-- Movio AI v5.0 — shot-plan (配置驱动) -->
<template>
  <WorkPipeline :config="shotPlanConfig" />
</template>
<script setup lang="ts">
import { shotPlanConfig } from '@/components/work/configs/text-batch'
import WorkPipeline from '@/components/work/pipeline/WorkPipeline.vue'
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>
