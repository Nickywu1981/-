<!-- Movio AI v5.0 — ghost-mannequin (配置驱动) -->
<template>
  <WorkPipeline :config="ghostMannequinConfig" />
</template>
<script setup lang="ts">
import { ghostMannequinConfig } from '@/components/work/configs/image-batch1'
import WorkPipeline from '@/components/work/pipeline/WorkPipeline.vue'
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>
