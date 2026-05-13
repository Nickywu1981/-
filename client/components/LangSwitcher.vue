<template>
  <div class="lsw">
    <button class="lsw-btn" @click="open = !open" :aria-label="$t('lang.switch')">
      <span>{{ currentFlag }}</span>
      <span class="lsw-code">{{ locale.toUpperCase() }}</span>
      <span class="lsw-arrow">▾</span>
    </button>
    <transition name="lsw-fade">
      <div v-if="open" class="lsw-drop" @mouseleave="open = false">
        <button
          v-for="l in locales"
          :key="l.code"
          class="lsw-opt"
          :class="{ on: locale === l.code }"
          @click="switchLang(l.code)"
        >
          <span class="lsw-flag">{{ l.flag }}</span>
          <span>{{ l.name }}</span>
        </button>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
const { locale } = useI18n()
const { refresh: refreshDynamic } = useI18nDynamic()
const open = ref(false)

interface LocaleOption { code: string; name: string; flag: string }
const locales: LocaleOption[] = [
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
]

const currentFlag = computed(() => locales.find(l => l.code === locale.value)?.flag || '🌐')

function switchLang(code: string) {
  locale.value = code as 'zh' | 'en'
  if (typeof window !== 'undefined') localStorage.setItem('lang', code)
  refreshDynamic()
  open.value = false
}
</script>

<style scoped>
.lsw { position: relative; }
.lsw-btn {
  display: flex; align-items: center; gap: 4px;
  padding: 6px 10px; border: 1px solid var(--border-light); border-radius: 8px;
  background: transparent; color: var(--text-primary); cursor: pointer;
  font-size: 12px; font-weight: 500; letter-spacing: -0.01em;
  transition: border-color 0.2s, background 0.2s;
}
.lsw-btn:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
.lsw-btn:hover { border-color: var(--text-muted); background: var(--bg-hover); }
.lsw-arrow { font-size: 10px; color: var(--text-secondary); transition: transform 0.2s; }
.lsw-drop {
  position: absolute; top: calc(100% + 4px); right: 0;
  background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 10px;
  box-shadow: var(--shadow-dropdown); z-index: 300;
  min-width: 150px; overflow: hidden; padding: 4px;
}
.lsw-opt {
  display: flex; align-items: center; gap: 10px; width: 100%;
  padding: 9px 14px; border: none; background: transparent;
  color: var(--text-primary); cursor: pointer; font-size: 13px; border-radius: 7px;
  transition: background 0.15s; text-align: left; letter-spacing: -0.01em;
}
.lsw-opt:focus-visible { outline: 2px solid var(--brand); outline-offset: -2px; border-radius: 7px; }
.lsw-opt:hover { background: var(--bg-hover); }
.lsw-opt.on { background: var(--bg-accent); font-weight: 500; }
.lsw-flag { font-size: 16px; }

.lsw-fade-enter-active, .lsw-fade-leave-active { transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1); }
.lsw-fade-enter-from, .lsw-fade-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
