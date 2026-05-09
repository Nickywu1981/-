<template>
  <div class="lsw">
    <button class="lsw-btn" @click="open = !open" :aria-label="'切换语言'">
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
  open.value = false
}
</script>

<style scoped>
.lsw { position: relative; }
.lsw-btn {
  display: flex; align-items: center; gap: 4px;
  padding: 6px 10px; border: 1px solid #ebebea; border-radius: 8px;
  background: transparent; color: #171717; cursor: pointer;
  font-size: 12px; font-weight: 500; letter-spacing: -0.01em;
  transition: all 0.2s;
}
.lsw-btn:hover { border-color: #c5c5c2; background: rgba(0,0,0,0.02); }
.lsw-arrow { font-size: 9px; color: #6b6b70; transition: transform 0.2s; }
.lsw-drop {
  position: absolute; top: calc(100% + 4px); right: 0;
  background: #fff; border: 1px solid #ebebea; border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.08); z-index: 300;
  min-width: 150px; overflow: hidden; padding: 4px;
}
.lsw-opt {
  display: flex; align-items: center; gap: 10px; width: 100%;
  padding: 9px 14px; border: none; background: transparent;
  color: #171717; cursor: pointer; font-size: 13px; border-radius: 7px;
  transition: background 0.15s; text-align: left; letter-spacing: -0.01em;
}
.lsw-opt:hover { background: #f5f5f4; }
.lsw-opt.on { background: #f0efed; font-weight: 500; }
.lsw-flag { font-size: 16px; }

.lsw-fade-enter-active, .lsw-fade-leave-active { transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1); }
.lsw-fade-enter-from, .lsw-fade-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
