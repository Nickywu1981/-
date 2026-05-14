<template>
  <div class="ent-plans">
    <h1 class="page-title">{{ $t('enterprise.plans.title') }}</h1>
    <p class="subtitle">{{ $t('enterprise.plans.currentPlan') }}<span class="plan-badge current">{{ planLabel }}</span></p>

    <div class="plan-cards">
      <div class="plan-card" v-for="plan in plans" :key="plan.id" :class="{ active: currentPlan === plan.id }">
        <h3>{{ plan.name }}</h3>
        <div class="plan-price">&yen;{{ plan.price }}<span class="unit">{{ $t('enterprise.plans.perMonth') }}</span></div>
        <p class="plan-desc">{{ plan.description }}</p>
        <ul class="plan-features">
          <li>{{ $t('enterprise.plans.credits', { n: plan.credits.toLocaleString() }) }}</li>
          <li>{{ $t('enterprise.plans.maxUsers', { n: plan.maxUsers }) }}</li>
          <li>{{ $t('enterprise.plans.imagesPerMonth', { n: plan.quotaImages.toLocaleString() }) }}</li>
          <li>{{ $t('enterprise.plans.videosPerMonth', { n: plan.quotaVideo.toLocaleString() }) }}</li>
        </ul>
        <button class="plan-btn" :class="{ current: currentPlan === plan.id }" disabled>
          {{ currentPlan === plan.id ? $t('enterprise.plans.currentPlanLabel') : $t('enterprise.plans.upgrade') }}
        </button>
      </div>
    </div>

    <div class="note">
      <p>{{ $t('enterprise.plans.contactSales') }}</p>
    </div>
  </div>
</template>

<script setup>
const toast = useToast();
const { t } = useI18n();
const plans = ref([]);
const currentPlan = ref('');

onMounted(async () => {
  try {
    const [planRes, profileRes] = await Promise.all([
      $fetch('/api/enterprise/plans', { credentials: 'include' }),
      $fetch('/api/enterprise/profile', { credentials: 'include' }),
    ]);
    plans.value = planRes.data || [];
    currentPlan.value = profileRes.data?.planType || '';
  } catch (e) { toast.error(t('enterprise.plans.loadFailed')); }
});

const planLabel = computed(() => {
  const p = plans.value.find(p => p.id === currentPlan.value);
  return p?.name || currentPlan.value || t('enterprise.plans.unknown');
});

definePageMeta({ layout: 'user-workspace', middleware: ['auth'] });
</script>

<style scoped>
.page-title { font-size: 24px; margin: 0 0 8px; color: var(--text-primary); }
.subtitle { color: var(--text-secondary); margin: 0 0 28px; font-size: 14px; }
.plan-badge.current { background: var(--bg-accent); color: var(--color-info-500); padding: 2px 12px; border-radius: 12px; font-size: 13px; }

.plan-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 32px; }
.plan-card { background: var(--bg-card); border-radius: 16px; padding: 28px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); text-align: center; border: 2px solid transparent; transition: border-color 0.2s; }
.plan-card.active { border-color: var(--color-brand-primary); }
.plan-card h3 { font-size: 18px; margin: 0 0 12px; color: var(--text-primary); }
.plan-price { font-size: 36px; font-weight: 700; color: var(--text-primary); }
.plan-price .unit { font-size: 14px; color: var(--text-muted); font-weight: 400; }
.plan-desc { color: var(--text-muted); font-size: 13px; margin: 8px 0 16px; }
.plan-features { list-style: none; padding: 0; margin: 0 0 20px; text-align: left; }
.plan-features li { padding: 6px 0; font-size: 14px; color: var(--text-secondary); border-bottom: 1px solid var(--border-light); }
.plan-features li::before { content: '✓ '; color: var(--color-success); font-weight: 700; }
.plan-btn { width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--color-brand-primary); background: var(--bg-card); color: var(--color-brand-primary); font-size: 14px; cursor: pointer; }
.plan-btn.current { background: var(--color-brand-primary); color: var(--text-inverse); cursor: default; }

.note { background: var(--warning-bg); border-radius: 10px; padding: 16px 20px; font-size: 14px; color: var(--color-warning-700); }
</style>
