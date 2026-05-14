<!-- Movio AI v5.0 — brand-settings (配置驱动) -->
<template>
  <WorkPipeline :config="brandSettingsConfig" />
</template>
<script setup lang="ts">
import { brandSettingsConfig } from '@/components/work/configs/simple-batch'
import WorkPipeline from '@/components/work/pipeline/WorkPipeline.vue'
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>
