<template>
  <Teleport to="body">
    <Transition name="palette-fade">
      <div v-if="visible" class="palette-overlay" @click.self="close">
        <div class="palette-dialog" role="dialog" :aria-label="$t('cmd_palette.dialog_label')">
          <!-- Search input -->
          <div class="palette-search">
            <span class="palette-search-icon">🔍</span>
            <input
              ref="inputRef"
              v-model="query"
              type="text"
              :placeholder="placeholder"
              class="palette-input"
              :aria-label="$t('cmd_palette.search')"
              @keydown="onKeydown"
              @input="onInput"
            />
            <kbd class="palette-esc" @click="close">ESC</kbd>
          </div>

          <!-- Results -->
          <div v-if="filtered.length > 0" class="palette-results" ref="resultsRef">
            <template v-for="(group, gidx) in grouped" :key="group.category">
              <div class="palette-group-label">{{ group.label }}</div>
              <div
                v-for="(item, idx) in group.items"
                :key="item.id"
                :ref="(el: any) => setItemRef(el, item.id)"
                class="palette-item"
                :class="{ active: activeIdx === getFlatIndex(gidx, idx) }"
                @click="select(item)"
                @mouseenter="activeIdx = getFlatIndex(gidx, idx)"
              >
                <span class="palette-item-icon">{{ item.icon }}</span>
                <div class="palette-item-content">
                  <span class="palette-item-name">{{ resolveToolDisplay(t, item).name }}</span>
                  <span class="palette-item-desc">{{ resolveToolDisplay(t, item).description }}</span>
                </div>
                <span class="palette-item-category">{{ group.label }}</span>
                <kbd class="palette-item-shortcut" v-if="getFlatIndex(gidx, idx) < 3">{{ getFlatIndex(gidx, idx) + 1 }}</kbd>
              </div>
            </template>
          </div>

          <!-- No results -->
          <div v-else-if="query.length > 0" class="palette-empty">
            <span class="palette-empty-icon">🔎</span>
            <p>{{ $t('cmd_palette.no_results', { query }) }}</p>
            <p class="palette-empty-hint">{{ $t('cmd_palette.no_results_hint') }}</p>
          </div>

          <!-- Default state -->
          <div v-else class="palette-default">
            <p class="palette-default-title">{{ $t('cmd_palette.quick_nav') }}</p>
            <div class="palette-hot-links">
              <button v-for="link in hotLinks" :key="link.id" class="palette-hot-btn" @click="select(link)">
                <span>{{ link.icon }}</span>
                <span>{{ link.name }}</span>
              </button>
            </div>
          </div>

          <!-- Footer -->
          <div class="palette-footer">
            <span><kbd>↑↓</kbd> {{ $t('cmd_palette.nav') }}</span>
            <span><kbd>↵</kbd> {{ $t('cmd_palette.enter') }}</span>
            <span><kbd>ESC</kbd> {{ $t('cmd_palette.close') }}</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { toolIndex, resolveToolDisplay, resolveCategoryLabel } from '~/composables/toolIndex';

interface ToolItem {
  id: string;
  keywords: string[];
  route: string;
  icon: string;
  category: string;
}

const { t } = useI18n()

const visible = ref(false);
const query = ref('');
const activeIdx = ref(0);
const inputRef = ref<HTMLInputElement | null>(null);
const resultsRef = ref<HTMLElement | null>(null);
const itemRefs = ref<Record<string, HTMLElement>>({});

const placeholder = computed(() => t('cmd_palette.placeholder'));

const hotLinks = computed(() => [
  { id: 'remove-bg', route: '/work/remove-bg', icon: '✂️' },
  { id: 'white-bg', route: '/work/white-bg', icon: '⬜' },
  { id: 'scene', route: '/work/scene', icon: '🏞️' },
  { id: 'video', route: '/work/video', icon: '🎬' },
  { id: 'batch', route: '/work/batch', icon: '📦' },
  { id: 'main-image', route: '/work/main-image', icon: '📷' },
].map(link => ({ ...link, name: resolveToolDisplay(t, toolIndex.find(ti => ti.id === link.id)!).name })))

// Fuzzy match scoring
function scoreItem(item: typeof toolIndex[number], q: string): number {
  const display = resolveToolDisplay(t, item)
  const nameLow = display.name.toLowerCase();
  const kwLow = item.keywords.map(k => k.toLowerCase());
  if (nameLow === q) return 100;
  if (nameLow.startsWith(q)) return 80;
  if (nameLow.includes(q)) return 60;
  if (kwLow.some(k => k === q)) return 70;
  if (kwLow.some(k => k.startsWith(q))) return 50;
  if (kwLow.some(k => k.includes(q))) return 30;
  return 0;
}

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return [];
  return toolIndex
    .map(item => ({ item, score: scoreItem(item, q) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map(({ item }) => item);
});

const grouped = computed(() => {
  const map = new Map<string, typeof toolIndex[number][]>();
  for (const item of filtered.value) {
    const key = item.category;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries()).map(([category, items]) => ({
    category,
    label: resolveCategoryLabel(t, category),
    items,
  }));
});

function getFlatIndex(gidx: number, idx: number): number {
  let count = 0;
  for (let i = 0; i < gidx; i++) count += grouped.value[i].items.length;
  return count + idx;
}

const totalItems = computed(() => filtered.value.length);

function setItemRef(el: any, id: string) {
  if (el) itemRefs.value[id] = el;
}

function onInput() {
  activeIdx.value = 0;
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') { e.preventDefault(); close(); return; }
  if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx.value = Math.min(activeIdx.value + 1, totalItems.value - 1); scrollToActive(); return; }
  if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx.value = Math.max(activeIdx.value - 1, 0); scrollToActive(); return; }
  if (e.key === 'Enter') {
    e.preventDefault();
    if (filtered.value[activeIdx.value]) select(filtered.value[activeIdx.value]);
  }
}

function scrollToActive() {
  nextTick(() => {
    const item = filtered.value[activeIdx.value];
    if (item) itemRefs.value[item.id]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
}

function select(item: { route: string; name: string }) {
  close();
  navigateTo(item.route);
}

function open() {
  visible.value = true;
  query.value = '';
  activeIdx.value = 0;
  nextTick(() => inputRef.value?.focus());
}

function close() {
  visible.value = false;
}

// Ctrl+K / Cmd+K global shortcut
function onGlobalKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    if (visible.value) close(); else open();
  }
}

onMounted(() => window.addEventListener('keydown', onGlobalKeydown));
onUnmounted(() => window.removeEventListener('keydown', onGlobalKeydown));

// Close on route change
watch(() => useRoute().path, close);
</script>

<style scoped>
.palette-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex; justify-content: center; padding-top: 15vh;
}
.palette-dialog {
  width: min(560px, 92vw); max-height: 70vh;
  background: var(--bg-card); border-radius: 16px;
  box-shadow: 0 16px 70px rgba(0,0,0,0.35);
  overflow: hidden; display: flex; flex-direction: column;
  border: 1px solid var(--border-light);
}

/* Search input */
.palette-search {
  display: flex; align-items: center; gap: 10px;
  padding: 16px 18px; border-bottom: 1px solid var(--border-light);
}
.palette-search-icon { font-size: 18px; flex-shrink: 0; opacity: 0.5; }
.palette-input {
  flex: 1; border: none; outline: none; font-size: 15px;
  background: transparent; color: var(--text-primary);
}
.palette-input:focus-visible {
  outline: 2px solid var(--brand, var(--cfg-primary));
  outline-offset: -2px;
  border-radius: 4px;
}
.palette-input::placeholder { color: var(--text-muted); }
.palette-esc {
  background: var(--bg-hover); border: 1px solid var(--border-light);
  padding: 2px 8px; border-radius: 6px; font-size: 11px;
  color: var(--text-muted); cursor: pointer; font-family: inherit;
}

/* Results area */
.palette-results {
  flex: 1; overflow-y: auto; padding: 8px;
}
.palette-group-label {
  font-size: 11px; color: var(--text-muted); padding: 8px 12px 4px;
  text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;
}
.palette-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 10px; cursor: pointer;
  transition: background 0.1s;
}
.palette-item:hover, .palette-item.active { background: var(--bg-hover); }
.palette-item.active { background: rgba(124,58,237,0.08); }
.palette-item-icon { font-size: 20px; flex-shrink: 0; width: 28px; text-align: center; }
.palette-item-content { flex: 1; min-width: 0; }
.palette-item-name { font-size: 14px; color: var(--text-primary); font-weight: 500; display: block; }
.palette-item-desc { font-size: 12px; color: var(--text-muted); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.palette-item-category { font-size: 11px; color: var(--text-muted); background: var(--tag-bg); padding: 1px 6px; border-radius: 4px; flex-shrink: 0; }
.palette-item-shortcut {
  background: var(--bg-hover); border: 1px solid var(--border-light);
  padding: 1px 6px; border-radius: 4px; font-size: 10px; color: var(--text-muted);
  font-family: inherit; flex-shrink: 0;
}

/* Empty / Default */
.palette-empty, .palette-default { padding: 32px 24px; text-align: center; }
.palette-empty-icon { font-size: 36px; display: block; margin-bottom: 12px; opacity: 0.5; }
.palette-empty p { font-size: 14px; color: var(--text-secondary); margin: 0 0 4px; }
.palette-empty-hint { font-size: 12px; color: var(--text-muted); }
.palette-default-title { font-size: 12px; color: var(--text-muted); margin: 0 0 12px; }
.palette-hot-links { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
.palette-hot-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 16px; border: 1px solid var(--border-light); border-radius: 10px;
  background: var(--bg-page); color: var(--text-primary); font-size: 13px;
  cursor: pointer; transition: border-color var(--transition-fast), background var(--transition-fast);
}
.palette-hot-btn:hover { border-color: var(--brand); background: rgba(124,58,237,0.06); }

/* Footer */
.palette-footer {
  display: flex; gap: 16px; padding: 10px 18px;
  border-top: 1px solid var(--border-light);
  font-size: 11px; color: var(--text-muted);
}
.palette-footer kbd {
  background: var(--bg-hover); border: 1px solid var(--border-light);
  padding: 1px 5px; border-radius: 4px; font-size: 10px; font-family: inherit;
}

/* Transitions */
.palette-fade-enter-active { transition: opacity 0.15s ease-out; }
.palette-fade-enter-active .palette-dialog { animation: palette-enter 0.2s ease-out; }
.palette-fade-leave-active { transition: opacity 0.12s ease-in; }
.palette-fade-leave-active .palette-dialog { animation: palette-leave 0.12s ease-in; }
.palette-fade-enter-from, .palette-fade-leave-to { opacity: 0; }

@keyframes palette-enter {
  from { opacity: 0; transform: scale(0.96) translateY(-8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes palette-leave {
  from { opacity: 1; transform: scale(1) translateY(0); }
  to { opacity: 0; transform: scale(0.96) translateY(-8px); }
}
</style>
