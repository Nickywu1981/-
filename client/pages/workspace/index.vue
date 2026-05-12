<!-- Movio AI v8.0 — redirect to creation center -->
<template>
  <div class="wh-redirect">
    <div class="wh-spinner" />
    <p>跳转至创作中心...</p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'workspace' })
const router = useRouter()
onMounted(() => { router.replace('/workspace/creation') })
</script>

<style scoped>
.wh-redirect { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; gap: 16px; color: #999; font-size: 14px; }
.wh-spinner { width: 28px; height: 28px; border: 3px solid #ebebea; border-top-color: #5b5fe3; border-radius: 50%; animation: spin .6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
