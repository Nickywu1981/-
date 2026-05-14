<!-- Movio AI v5.0 — compliance-check (配置驱动) -->
<template>
  <WorkPipeline :config="complianceCheckConfig" />
</template>
<script setup lang="ts">
import { complianceCheckConfig } from '@/components/work/configs/simple-batch'
import WorkPipeline from '@/components/work/pipeline/WorkPipeline.vue'
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>
