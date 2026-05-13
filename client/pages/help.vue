<template>
  <div class="help-page">
    <div class="help-hero">
      <h2>{{ $t('help.title') }}</h2>
      <p>{{ $t('help.subtitle') }}</p>
    </div>

    <div class="search-bar">
      <svg class="search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <input v-model="search" type="text" :placeholder="$t('help.search_placeholder')" @input="filterLocal" />
    </div>

    <div class="category-tabs">
      <button v-for="cat in categories" :key="cat.key" class="cat-tab" :class="{ active: activeCat === cat.key }" @click="activeCat = cat.key">
        {{ cat.label }}
        <span class="count">{{ catCount(cat.key) }}</span>
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="skeleton-item" v-for="i in 4" :key="i"><div class="sk-q" /><div class="sk-a" /></div>
    </div>

    <div v-else-if="error" class="error-state">
      <span class="err-icon">!</span>
      <p>{{ error }}</p>
      <button class="retry-btn" @click="fetchFaqs">{{ $t('help.retry') }}</button>
    </div>

    <div v-else-if="filteredFaqs.length === 0" class="empty-state">
      <span class="empty-icon">🔍</span>
      <p>{{ $t('help.no_results') }}</p>
      <p class="empty-sub">{{ $t('help.no_results_hint') }}</p>
    </div>

    <div v-else class="faq-list">
      <div v-for="(item, i) in filteredFaqs" :key="item.id || i" class="faq-item" :class="{ open: open === i }">
        <div class="faq-q" @click="toggle(i)" @keydown.enter="toggle(i)" @keydown.space.prevent="toggle(i)" tabindex="0" role="button">
          <span class="q-text">{{ item.question }}</span>
          <span class="arrow">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
          </span>
        </div>
        <div v-if="open === i" class="faq-a">
          <div class="a-content">{{ item.answer }}</div>
          <div class="a-footer">
            <span class="a-cat">{{ catLabel(item.category) }}</span>
            <span class="a-helpful">{{ $t('help.helpful') }}
              <button class="a-fb-btn" :class="{ voted: item.voted === 1 }" @click="voteFaq(item, 1)">👍 {{ item.upvotes || 0 }}</button>
              <button class="a-fb-btn" :class="{ voted: item.voted === -1 }" @click="voteFaq(item, -1)">👎 {{ item.downvotes || 0 }}</button>
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="contact-bar">
      <span>{{ $t('help.no_answer') }}</span>
      <a href="mailto:support@movio.ai">📧 support@movio.ai</a>
      <span class="contact-time">{{ $t('help.work_hours') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const search = ref('')
const open = ref(-1)
const activeCat = ref('all')
const loading = ref(true)
const error = ref('')
const faqs = ref<any[]>([])

const categories = computed(() => [
  { key: 'all', label: t('help.cat_all') },
  { key: 'usage', label: t('help.cat_usage') },
  { key: 'account', label: t('help.cat_account') },
  { key: 'platform', label: t('help.cat_platform') },
])

function catLabel(key: string) {
  return categories.value.find(c => c.key === key)?.label || key
}

function catCount(key: string) {
  if (key === 'all') return faqs.value.length
  return faqs.value.filter(f => f.category === key).length
}

const filteredFaqs = computed(() => {
  let list = faqs.value
  if (activeCat.value !== 'all') list = list.filter(f => f.category === activeCat.value)
  if (search.value.trim()) {
    const kw = search.value.toLowerCase()
    list = list.filter(f => f.question.toLowerCase().includes(kw) || f.answer.toLowerCase().includes(kw))
  }
  return list
})

function filterLocal() { open.value = -1 }
function toggle(i: number) { open.value = open.value === i ? -1 : i }

function voteFaq(item: any, v: number) {
  if (item.voted === v) {
    item.voted = 0
    if (v === 1) item.upvotes--; else item.downvotes--
  } else {
    if (item.voted === 1) item.upvotes--
    if (item.voted === -1) item.downvotes--
    if (v === 1) item.upvotes++; else item.downvotes++
    item.voted = v
  }
}

async function fetchFaqs() {
  loading.value = true; error.value = ''
  try {
    const data: any = await $fetch('/api/help', { credentials: 'include' })
    if (data.code === 200) {
      faqs.value = (data.data?.list || []).map((f: any) => ({
        ...f, voted: 0, upvotes: 0, downvotes: 0,
      }))
    } else {
      error.value = data.msg || t('help.load_failed')
    }
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string };
    error.value = err?.data?.msg || t('help.load_error')
  } finally { loading.value = false }
}

onMounted(() => fetchFaqs())

definePageMeta({ layout: 'landing' })
</script>

<style scoped>
.help-page { max-width: 800px; margin: 0 auto; padding: 32px 16px 60px; }
.help-hero { text-align: center; margin-bottom: 28px; }
.help-hero h2 { font-size: 26px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
.help-hero p { font-size: 14px; color: var(--text-secondary); }

.search-bar { position: relative; margin-bottom: 20px; }
.search-bar input { width: 100%; padding: 12px 16px 12px 42px; border: 2px solid var(--input-border); border-radius: var(--radius-xl); font-size: 15px; outline: none; box-sizing: border-box; background: var(--bg-card); color: var(--text-primary); transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.search-bar input:focus { border-color: var(--brand); box-shadow: var(--focus-ring); }
.search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }

.category-tabs { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
.cat-tab { padding: 6px 16px; border: 1px solid var(--input-border); border-radius: 20px; background: var(--bg-card); color: var(--text-secondary); font-size: 13px; cursor: pointer; transition: background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast); display: flex; align-items: center; gap: 6px; }
.cat-tab:hover { border-color: var(--brand); color: var(--brand); }
.cat-tab.active { background: var(--brand-gradient); color: #fff; border-color: transparent; }
.cat-tab .count { font-size: 11px; opacity: 0.7; }

.loading-state { display: flex; flex-direction: column; gap: 10px; }
.skeleton-item { padding: 20px; background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-lg); }
.sk-q { height: 18px; width: 60%; background: var(--bg-secondary); border-radius: 4px; margin-bottom: 10px; animation: pulse 1.5s infinite; }
.sk-a { height: 14px; width: 90%; background: var(--bg-secondary); border-radius: 4px; animation: pulse 1.5s infinite; animation-delay: .3s; }
@keyframes pulse { 0%,100% { opacity: .4; } 50% { opacity: .8; } }

.error-state, .empty-state { text-align: center; padding: 60px 20px; }
.error-state { color: var(--danger); }
.error-state .err-icon { width: 28px; height: 28px; border-radius: 50%; background: var(--danger); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; margin-bottom: 12px; }
.error-state p, .empty-state p { font-size: 15px; margin: 0 0 8px; }
.retry-btn { margin-top: 12px; padding: 8px 24px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: 14px; font-weight: 600; transition: opacity var(--transition-fast); }
.retry-btn:hover { opacity: 0.85; }
.empty-state .empty-icon { font-size: 36px; display: block; margin-bottom: 12px; }
.empty-state { color: var(--text-secondary); }
.empty-sub { font-size: 13px !important; color: var(--text-muted) !important; }

.faq-list { display: flex; flex-direction: column; gap: 8px; }
.faq-item { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-lg); overflow: hidden; transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.faq-item:hover { border-color: var(--brand-alpha); box-shadow: 0 2px 8px rgba(124,58,237,.06); }
.faq-item.open { border-color: var(--brand); box-shadow: 0 4px 16px var(--brand-alpha); }
.faq-q { display: flex; justify-content: space-between; align-items: center; padding: 16px 18px; cursor: pointer; user-select: none; }
.q-text { font-size: 15px; font-weight: 500; color: var(--text-primary); flex: 1; padding-right: 12px; }
.arrow { color: var(--text-tertiary); transition: transform var(--transition-fast); flex-shrink: 0; }
.faq-item.open .arrow { transform: rotate(180deg); color: var(--brand); }
.faq-a { padding: 0 18px 16px; }
.a-content { font-size: 14px; color: var(--text-secondary); line-height: 1.8; margin-bottom: 12px; white-space: pre-wrap; }
.a-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px solid var(--border-light); }
.a-cat { font-size: 11px; padding: 2px 8px; background: var(--brand-alpha); color: var(--brand); border-radius: 10px; }
.a-helpful { font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 4px; }
.a-fb-btn { padding: 2px 8px; font-size: 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); background: transparent; cursor: pointer; transition: border-color var(--transition-fast), background var(--transition-fast); }
.a-fb-btn:hover { border-color: var(--brand); }
.a-fb-btn.voted { border-color: var(--brand); background: var(--brand-alpha); }

.contact-bar { margin-top: 40px; padding: 16px 20px; background: var(--brand-alpha); border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; gap: 12px; font-size: 14px; color: var(--brand); flex-wrap: wrap; }
.contact-bar a { color: var(--brand); font-weight: 600; text-decoration: none; }
.contact-bar a:hover { text-decoration: underline; }
.contact-time { color: var(--text-muted); font-size: 13px; }
</style>
