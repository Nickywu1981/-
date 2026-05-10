<template>
  <div class="image-slot" :class="{ 'slot-sm': size === 'sm' }" role="button" tabindex="0" @click="$emit('click')" @keydown.enter="$emit('click')">
    <img
      v-if="src"
      :src="src"
      :alt="alt"
      class="slot-img"
      loading="lazy"
      :style="{ opacity: loaded ? 1 : 0.5, transition: 'opacity 0.3s' }"
      @load="loaded = true"
      @error="loaded = false"
    />
    <div v-else class="slot-empty"><span>{{ emptyText }}</span></div>
    <div v-if="title" class="slot-title">{{ title }}</div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  src?: string
  alt?: string
  title?: string
  emptyText?: string
  size?: 'sm' | 'md'
}
withDefaults(defineProps<Props>(), { emptyText: '暂无图片', size: 'md' })
defineEmits<{ click: [] }>()

const loaded = ref(false)
</script>

<style scoped>
.image-slot { width: 100%; aspect-ratio: 1; border-radius: var(--radius-lg); overflow: hidden; background: var(--bg-hover); border: 2px dashed var(--border-light); display: flex; align-items: center; justify-content: center; cursor: pointer; position: relative; transition: border-color 0.15s; }
.image-slot:hover { border-color: var(--brand); }
.slot-sm { aspect-ratio: 4/3; }
.slot-img { width: 100%; height: 100%; object-fit: contain; }
.slot-empty { color: var(--text-muted); font-size: 14px; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.slot-title { position: absolute; bottom: 0; left: 0; right: 0; padding: 6px 10px; background: rgba(0,0,0,0.6); color: #fff; font-size: 12px; text-align: center; }
</style>
