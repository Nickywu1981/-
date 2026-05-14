<!-- Movio AI v5.0 — platform-detail (配置驱动) -->
<template>
  <WorkPipeline :config="platformDetailConfig" />
</template>
<script setup lang="ts">
import { platformDetailConfig } from '@/components/work/configs/image-batch2'
import WorkPipeline from '@/components/work/pipeline/WorkPipeline.vue'
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>
