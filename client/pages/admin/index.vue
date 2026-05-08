<template>
  <NuxtLayout name="workspace">
    <div class="admin-redirect"><LoadingSkeleton type="card" :rows="3" /></div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
await navigateTo('/admin/dashboard', { replace: true })
</script>
