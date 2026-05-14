<!--
  Movio AI v5.0 — Remove BG Page (配置驱动)
  G4 Frontend-A | 接入 WorkPipeline 通用模板
  从 285 行缩减到 12 行
-->
<template>
  <WorkPipeline :config="removeBgConfig" />
</template>

<script setup lang="ts">
import { removeBgConfig } from '@/components/work/configs/remove-bg'
import WorkPipeline from '@/components/work/pipeline/WorkPipeline.vue'

definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>
