<template>
  <div class="badge-selector">
    <label class="label">营销标签（可选）</label>
    <div class="badge-list">
      <button
        v-for="b in badges"
        :key="b.id"
        type="button"
        class="badge-chip"
        :class="{ active: isSelected(b.id) }"
        :style="{ '--chip-color': b.color }"
        @click="toggle(b.id)"
      >
        <span class="chip-icon">{{ iconMap[b.icon] || '🏷️' }}</span>
        <span class="chip-name">{{ b.name }}</span>
      </button>
    </div>
    <p v-if="selectedIds.length" class="selected-hint">已选 {{ selectedIds.length }} 个标签</p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: number[] }>();
const emit = defineEmits<{ 'update:modelValue': [v: number[]] }>();

interface Badge {
  id: number;
  name: string;
  icon: string;
  color: string;
  category: string;
}

const badges = ref<Badge[]>([]);

const iconMap: Record<string, string> = {
  fire: '🔥', star: '⭐', clock: '⏰', discount: '🏷️',
  shield: '🛡️', undo: '↩️', global: '🌍', plane: '✈️', gift: '🎁',
};

const selectedIds = computed(() => props.modelValue || []);

function isSelected(id: number) {
  return selectedIds.value.includes(id);
}

function toggle(id: number) {
  const next = isSelected(id)
    ? selectedIds.value.filter(v => v !== id)
    : [...selectedIds.value, id];
  emit('update:modelValue', next);
}

async function fetchBadges() {
  try {
    const res = await $fetch('/api/badges', { credentials: 'include' });
    badges.value = (res as any).data || [];
  } catch { /* silent */ }
}

onMounted(() => { fetchBadges(); });
</script>

<style scoped>
.label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 8px; }
.badge-list { display: flex; flex-wrap: wrap; gap: 8px; }
.badge-chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 5px 12px; border-radius: var(--badge-radius); font-size: 13px;
  border: 1.5px solid var(--input-border); background: var(--bg-card);
  color: var(--text-primary); cursor: pointer; transition: all var(--transition-fast);
}
.badge-chip:hover { border-color: var(--chip-color, var(--brand)); box-shadow: 0 0 0 2px color-mix(in srgb, var(--chip-color, #7C3AED) 15%, transparent); }
.badge-chip.active {
  border-color: var(--chip-color, var(--brand));
  background: color-mix(in srgb, var(--chip-color, #7C3AED) 12%, var(--bg-card));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--chip-color, #7C3AED) 18%, transparent);
}
.chip-icon { font-size: 14px; }
.chip-name { font-weight: 500; }
.selected-hint { margin-top: 6px; font-size: 12px; color: var(--text-muted); }
</style>
