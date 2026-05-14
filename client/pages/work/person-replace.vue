<!-- Movio AI v5.0 — Person Replace (配置驱动) -->
<template>
  <WorkPipeline :config="personReplaceConfig" />
</template>
<script setup lang="ts">
import { personReplaceConfig } from '@/components/work/configs/person-replace'
import WorkPipeline from '@/components/work/pipeline/WorkPipeline.vue'
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>
