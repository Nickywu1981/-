<template>
  <div class="ent-plans">
    <h1 class="page-title">套餐管理</h1>
    <p class="subtitle">当前套餐：<span class="plan-badge current">{{ planLabel }}</span></p>

    <div class="plan-cards">
      <div class="plan-card" v-for="plan in plans" :key="plan.id" :class="{ active: currentPlan === plan.id }">
        <h3>{{ plan.name }}</h3>
        <div class="plan-price">¥{{ plan.price }}<span class="unit">/月</span></div>
        <p class="plan-desc">{{ plan.description }}</p>
        <ul class="plan-features">
          <li>{{ plan.credits.toLocaleString() }} 积分</li>
          <li>最多 {{ plan.maxUsers }} 个子账号</li>
          <li>{{ plan.quotaImages.toLocaleString() }} 图片/月</li>
          <li>{{ plan.quotaVideo.toLocaleString() }} 视频/月</li>
        </ul>
        <button class="plan-btn" :class="{ current: currentPlan === plan.id }" disabled>
          {{ currentPlan === plan.id ? '当前套餐' : '升级' }}
        </button>
      </div>
    </div>

    <div class="note">
      <p>如需升级或定制套餐，请联系客户经理或发送邮件至 <strong>sales@movio.ai</strong></p>
    </div>
  </div>
</template>

<script setup>
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
  } catch (e) { console.error(e); }
});

const planLabel = computed(() => {
  const p = plans.value.find(p => p.id === currentPlan.value);
  return p?.name || currentPlan.value || '未知';
});

definePageMeta({ layout: 'enterprise' });
</script>

<style scoped>
.page-title { font-size: 24px; margin: 0 0 8px; color: #1a1a2e; }
.subtitle { color: #666; margin: 0 0 28px; font-size: 14px; }
.plan-badge.current { background: #e8f0fe; color: #1a73e8; padding: 2px 12px; border-radius: 12px; font-size: 13px; }

.plan-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 32px; }
.plan-card { background: #fff; border-radius: 16px; padding: 28px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); text-align: center; border: 2px solid transparent; transition: border-color 0.2s; }
.plan-card.active { border-color: #667eea; }
.plan-card h3 { font-size: 18px; margin: 0 0 12px; color: #1a1a2e; }
.plan-price { font-size: 36px; font-weight: 700; color: #1a1a2e; }
.plan-price .unit { font-size: 14px; color: #999; font-weight: 400; }
.plan-desc { color: #888; font-size: 13px; margin: 8px 0 16px; }
.plan-features { list-style: none; padding: 0; margin: 0 0 20px; text-align: left; }
.plan-features li { padding: 6px 0; font-size: 14px; color: #555; border-bottom: 1px solid #f5f5f5; }
.plan-features li::before { content: '✓ '; color: #27ae60; font-weight: 700; }
.plan-btn { width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #667eea; background: #fff; color: #667eea; font-size: 14px; cursor: pointer; }
.plan-btn.current { background: #667eea; color: #fff; cursor: default; }

.note { background: #fffbe6; border-radius: 10px; padding: 16px 20px; font-size: 14px; color: #8a6d14; }
</style>
