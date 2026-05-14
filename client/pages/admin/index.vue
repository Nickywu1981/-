<template>
  <NuxtLayout name="workspace">
    <div class="admin-redirect"><LoadingSkeleton type="card" :rows="3" /></div>
  </NuxtLayout>
</template>

<script setup lang="ts">

await navigateTo('/admin/dashboard', { replace: true })
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>
