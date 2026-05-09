<template>
  <AdminLayout>
    <h2 class="ptitle">多语言管理</h2>
    <div class="stats-row">
      <div class="stat-card"><span class="stat-val">{{ languages.length }}</span><span class="stat-lbl">支持语言</span></div>
      <div class="stat-card"><span class="stat-val">{{ scriptTypes.length }}</span><span class="stat-lbl">文案类型</span></div>
    </div>

    <div class="section" v-if="languages.length">
      <h3>已支持语言</h3>
      <div class="lang-grid">
        <div v-for="l in languages" :key="l.code" class="lang-card">
          <span class="lang-flag">{{ l.flag || '🌐' }}</span>
          <span class="lang-name">{{ l.name }}</span>
          <code class="lang-code">{{ l.code }}</code>
        </div>
      </div>
    </div>

    <div class="section" v-if="scriptTypes.length">
      <h3>文案类型</h3>
      <div class="tag-list">
        <span v-for="s in scriptTypes" :key="s.value" class="tag">{{ s.label || s.value }}</span>
      </div>
    </div>
  </AdminLayout>
</template>
<script setup lang="ts">

const languages = ref<any[]>([])
const scriptTypes = ref<any[]>([])
const toast = useToast()

async function fetchLanguages() {
  try {
    const data: any = await $fetch('/api/multilingual/languages', { credentials: 'include' })
    languages.value = data?.data || []
  } catch(e: any) { toast.error(e.data?.msg || '加载失败') }
}

async function fetchScriptTypes() {
  try {
    const data: any = await $fetch('/api/multilingual/script-types', { credentials: 'include' })
    scriptTypes.value = data?.data || []
  } catch(e: any) { toast.error(e.data?.msg || '加载失败') }
}

onMounted(() => { fetchLanguages(); fetchScriptTypes() })
</script>
<style scoped>
h2 { font-size: 22px; font-weight: 700; color: var(--text-primary); margin-bottom: 20px; }
h3 { font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px; }

.stats-row { display: flex; gap: 12px; margin-bottom: 24px; }
.stat-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 20px 28px; display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 140px; }
.stat-val { font-size: 28px; font-weight: 700; color: var(--brand); }
.stat-lbl { font-size: 13px; color: var(--text-muted); }

.section { margin-bottom: 24px; }

.lang-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
.lang-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 6px; transition: all var(--transition-base); }
.lang-card:hover { border-color: var(--brand); box-shadow: var(--shadow-card); }
.lang-flag { font-size: 28px; }
.lang-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.lang-code { font-size: 12px; color: var(--text-muted); background: var(--tag-bg); padding: 2px 8px; border-radius: var(--radius-xs); }

.tag-list { display: flex; flex-wrap: wrap; gap: 8px; }
.tag { display: inline-block; padding: 6px 14px; background: var(--brand-light); color: var(--brand); border-radius: var(--radius-full); font-size: 13px; font-weight: 500; border: 1px solid var(--brand-alpha-20); }
</style>
