<!-- Movio AI v8.0 — 智能体中心 -->
<template>
  <div class="ag">
    <header class="ag-header">
      <h1 class="ag-title">🤖 {{ $t('workspace.nav_agent') }}</h1>
      <p class="ag-subtitle">{{ $t('workspace.assistant_desc') }}</p>
    </header>

    <div class="ag-grid">
      <div
        v-for="agent in agents"
        :key="agent.id"
        class="ag-card"
        @click="openAgent(agent)"
        @keydown.enter="openAgent(agent)"
        @keydown.space.prevent="openAgent(agent)"
        tabindex="0"
        role="button"
        :aria-label="agent.title"
      >
        <div class="ag-card-icon">{{ agent.icon }}</div>
        <h3 class="ag-card-title">{{ agent.title }}</h3>
        <p class="ag-card-desc">{{ agent.desc }}</p>
        <span class="ag-card-badge">{{ agent.tag }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'workspace' })
const { t, tm } = useI18n()
const toast = useToast()

type Agent = { id: string; icon: string; title: string; desc: string; tag: string }
const agents = computed(() => (tm('workspace.assistant_agents') || []) as Agent[])

function openAgent(agent: Agent) {
  toast.info(`${agent.title} — ${t('workspace.coming_soon_title')}`)
}
</script>

<style scoped>
.ag {
  max-width: 1120px; margin: 0 auto; padding: 24px 28px;
}
.ag-header { margin-bottom: 28px; }
.ag-title {
  font-size: 22px; font-weight: 600; color: var(--tx, #171717);
  margin: 0 0 8px; letter-spacing: -0.03em;
}
.ag-subtitle {
  font-size: 14px; color: var(--tx2, #6b6b70); margin: 0; line-height: 1.6;
  max-width: 580px;
}

.ag-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

.ag-card {
  background: var(--bg-card, #fff);
  border: 1.5px solid var(--brd, #ebebea);
  border-radius: 12px;
  padding: 22px 20px;
  cursor: pointer;
  transition: all .2s;
}
.ag-card:hover {
  border-color: var(--brand, #5b5fe3);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(91,95,227,.1);
}
.ag-card:focus-visible {
  outline: 2px solid var(--brand, #5b5fe3);
  outline-offset: 2px;
}

.ag-card-icon {
  font-size: 36px; margin-bottom: 10px; width: 48px; height: 48px;
  border-radius: 10px; background: var(--brand-light, #f5f3ff);
  display: flex; align-items: center; justify-content: center;
}
.ag-card-title {
  font-size: 15px; font-weight: 500; color: var(--tx, #171717);
  margin: 0 0 6px;
}
.ag-card-desc {
  font-size: 13px; color: var(--tx2, #6b6b70); line-height: 1.55; margin: 0 0 12px;
}
.ag-card-badge {
  display: inline-block; font-size: 11px; padding: 3px 10px;
  border-radius: 6px; background: var(--brand-light, #f5f3ff); color: var(--brand, #5b5fe3); font-weight: 500;
}

/* Dark mode */
:root[data-theme="dark"] .ag-card, :root.dark .ag-card { background: var(--bg-card); border-color: var(--brd); }
:root[data-theme="dark"] .ag-card-title, :root.dark .ag-card-title { color: var(--tx); }
:root[data-theme="dark"] .ag-card-desc, :root.dark .ag-card-desc { color: var(--tx2); }
:root[data-theme="dark"] .ag-card-icon, :root.dark .ag-card-icon { background: var(--brand-light); }
:root[data-theme="dark"] .ag-card-badge, :root.dark .ag-card-badge { background: var(--brand-light); color: var(--brand); }

@media (max-width: 900px) {
  .ag { padding: 16px; }
  .ag-grid { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; }
}
@media (max-width: 600px) {
  .ag-grid { grid-template-columns: 1fr; }
}
</style>
