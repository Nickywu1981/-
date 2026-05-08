<template>
  <div class="lang-switcher">
    <button class="lang-btn" @click="open = !open">
      <span>{{ currentFlag }}</span>
      <span class="lang-code">{{ locale.toUpperCase() }}</span>
      <span class="arrow">▾</span>
    </button>
    <div v-if="open" class="lang-dropdown" @mouseleave="open = false">
      <button v-for="l in locales" :key="l.code" class="lang-option" :class="{ active: locale === l.code }" @click="switchLang(l.code); open = false">
        <span class="lang-flag">{{ l.flag }}</span>
        <span>{{ l.name }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const { locale, locales: i18nLocales } = useI18n();
const open = ref(false);

interface LocaleOption { code: string; name: string; flag: string }
const locales: LocaleOption[] = [
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
];

const currentFlag = computed(() => locales.find(l => l.code === locale.value)?.flag || '🌐');

function switchLang(code: string) {
  locale.value = code;
  if (typeof window !== 'undefined') localStorage.setItem('lang', code);
  open.value = false;
}

onMounted(() => {
  const saved = typeof window !== 'undefined' ? localStorage.getItem('lang') : null;
  if (saved && locales.some(l => l.code === saved)) locale.value = saved;
});
</script>

<style scoped>
.lang-switcher { position: relative; }
.lang-btn {
  display: flex; align-items: center; gap: 4px;
  padding: 4px 10px; border: 1px solid var(--border-light); border-radius: var(--radius-sm);
  background: transparent; color: var(--text-primary); cursor: pointer; font-size: 12px;
  transition: border-color var(--transition-fast);
}
.lang-btn:hover { border-color: var(--brand); }
.arrow { font-size: 10px; color: var(--text-muted); }
.lang-dropdown {
  position: absolute; top: 100%; right: 0; margin-top: 4px;
  background: var(--bg-card); border: 1px solid var(--input-border);
  border-radius: var(--radius-md); box-shadow: var(--shadow-dropdown);
  z-index: 300; min-width: 140px; overflow: hidden;
}
.lang-option {
  display: flex; align-items: center; gap: 8px; width: 100%;
  padding: 8px 14px; border: none; background: transparent;
  color: var(--text-primary); cursor: pointer; font-size: 13px;
  transition: background var(--transition-fast); text-align: left;
}
.lang-option:hover { background: var(--sidebar-hover-bg); }
.lang-option.active { background: var(--sidebar-active-bg); color: var(--brand); }
.lang-flag { font-size: 16px; }
</style>
