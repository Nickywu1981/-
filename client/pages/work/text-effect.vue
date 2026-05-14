<!-- Movio AI v5.0 — text-effect (配置驱动) -->
<template>
  <WorkPipeline :config="textEffectConfig" />
</template>
<script setup lang="ts">
import { textEffectConfig } from '@/components/work/configs/image-batch1'
import WorkPipeline from '@/components/work/pipeline/WorkPipeline.vue'
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>
