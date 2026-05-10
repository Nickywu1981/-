<template>
  <Teleport to="body">
    <div v-if="visible" class="lightbox-overlay" @click.self="close" @keydown.esc="close" tabindex="0" ref="overlay">
      <button class="lightbox-close" @click="close" aria-label="关闭">✕</button>
      <button v-if="hasPrev" class="lightbox-nav lightbox-prev" @click.stop="prev" aria-label="上一张">‹</button>
      <button v-if="hasNext" class="lightbox-nav lightbox-next" @click.stop="next" aria-label="下一张">›</button>
      <div class="lightbox-body" @click.stop>
        <img :src="currentSrc" :alt="currentAlt" @load="loaded = true" />
        <div v-if="currentTitle" class="lightbox-caption">{{ currentTitle }}</div>
        <div class="lightbox-counter" v-if="images.length > 1">{{ index + 1 }} / {{ images.length }}</div>
      </div>
      <div v-if="images.length > 1" class="lightbox-thumb-strip">
        <div v-for="(img, i) in images" :key="i" class="lightbox-thumb" :class="{ active: i === index }" @click.stop="jump(i)">
          <img :src="typeof img === 'string' ? img : img.src" :alt="`缩略图 ${i + 1}`" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
interface ImageItem { src: string; alt?: string; title?: string }

const visible = ref(false);
const index = ref(0);
const loaded = ref(false);
const images = ref<(string | ImageItem)[]>([]);
const overlay = ref<HTMLElement | null>(null);

const currentSrc = computed(() => {
  const item = images.value[index.value];
  return typeof item === 'string' ? item : item?.src || '';
});
const currentAlt = computed(() => {
  const item = images.value[index.value];
  return typeof item === 'string' ? '' : item?.alt || '';
});
const currentTitle = computed(() => {
  const item = images.value[index.value];
  return typeof item === 'string' ? '' : item?.title || '';
});
const hasPrev = computed(() => index.value > 0);
const hasNext = computed(() => index.value < images.value.length - 1);

function open(items: (string | ImageItem)[], startIdx = 0) {
  images.value = items;
  index.value = Math.min(startIdx, items.length - 1);
  loaded.value = false;
  visible.value = true;
  nextTick(() => overlay.value?.focus());
}

function close() { visible.value = false; }
function prev() { if (hasPrev.value) { index.value--; loaded.value = false; } }
function next() { if (hasNext.value) { index.value++; loaded.value = false; } }
function jump(i: number) { index.value = i; loaded.value = false; }

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close();
  if (e.key === 'ArrowLeft') prev();
  if (e.key === 'ArrowRight') next();
}

onMounted(() => window.addEventListener('keydown', onKey));
onUnmounted(() => window.removeEventListener('keydown', onKey));

defineExpose({ open, close });
</script>

<style scoped>
.lightbox-overlay {
  position: fixed; inset: 0; z-index: var(--cfg-z-modal, 1050);
  background: rgba(0,0,0,0.92);
  display: flex; align-items: center; justify-content: center;
  flex-direction: column;
  outline: none;
}
.lightbox-overlay:focus-visible {
  box-shadow: inset 0 0 0 3px var(--brand);
}
.lightbox-close {
  position: absolute; top: 16px; right: 16px;
  background: rgba(255,255,255,0.15); border: none; color: var(--text-inverse, #fff);
  font-size: 24px; width: 44px; height: 44px; border-radius: 50%;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  z-index: 10;
  transition: background 0.15s;
}
.lightbox-close:hover { background: rgba(255,255,255,0.25); }
.lightbox-nav {
  position: absolute; top: 50%; transform: translateY(-50%);
  background: rgba(255,255,255,0.12); border: none; color: var(--text-inverse, #fff);
  font-size: 40px; width: 56px; height: 80px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s; z-index: 10;
}
.lightbox-nav:hover { background: rgba(255,255,255,0.2); }
.lightbox-prev { left: 0; border-radius: 0 8px 8px 0; }
.lightbox-next { right: 0; border-radius: 8px 0 0 8px; }
.lightbox-body {
  max-width: 90vw; max-height: 78vh;
  display: flex; flex-direction: column; align-items: center;
}
.lightbox-body img {
  max-width: 90vw; max-height: 70vh;
  object-fit: contain; border-radius: 4px;
}
.lightbox-caption { color: var(--text-tertiary); font-size: 14px; margin-top: 12px; text-align: center; }
.lightbox-counter { color: var(--text-tertiary); font-size: 13px; margin-top: 8px; }
.lightbox-thumb-strip {
  display: flex; gap: 8px; margin-top: 16px; padding: 0 16px;
  max-width: 90vw; overflow-x: auto;
}
.lightbox-thumb {
  width: 56px; height: 56px; border-radius: 6px; overflow: hidden;
  cursor: pointer; border: 2px solid transparent; opacity: 0.5;
  transition: border-color 0.15s, opacity 0.15s; flex-shrink: 0;
}
.lightbox-thumb.active { border-color: var(--brand); opacity: 1; }
.lightbox-thumb img { width: 100%; height: 100%; object-fit: cover; }

@media (max-width: 640px) {
  .lightbox-nav { font-size: 28px; width: 40px; height: 56px; }
  .lightbox-close { top: 8px; right: 8px; font-size: 20px; width: 36px; height: 36px; }
}
</style>
