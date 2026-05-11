<template>
  <div class="ent-dashboard">
    <h1 class="page-title">工作台</h1>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">子账号数</div>
        <div class="stat-value">{{ dashboard.stats?.userCount || 0 }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">30天调用次数</div>
        <div class="stat-value">{{ formatNumber(dashboard.stats?.totalCalls30d || 0) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">30天消耗积分</div>
        <div class="stat-value">{{ formatNumber(dashboard.stats?.totalCredits30d || 0) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">图片配额</div>
        <div class="stat-value">{{ formatNumber(dashboard.stats?.quotaImages || 0) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">视频配额</div>
        <div class="stat-value">{{ formatNumber(dashboard.stats?.quotaVideo || 0) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">账户余额</div>
        <div class="stat-value">¥{{ dashboard.enterprise?.balance || 0 }}</div>
      </div>
    </div>

    <!-- 企业信息 -->
    <div class="info-section">
      <h2>企业信息</h2>
      <div class="info-grid">
        <div class="info-item"><span class="label">企业名称</span><span>{{ enterprise.name }}</span></div>
        <div class="info-item"><span class="label">企业编码</span><span>{{ enterprise.code }}</span></div>
        <div class="info-item"><span class="label">企业类型</span><span>{{ typeLabel }}</span></div>
        <div class="info-item"><span class="label">套餐</span><span class="plan-badge">{{ planLabel }}</span></div>
        <div class="info-item"><span class="label">联系人</span><span>{{ enterprise.contactName }}</span></div>
        <div class="info-item"><span class="label">联系电话</span><span>{{ enterprise.contactPhone }}</span></div>
      </div>
    </div>

    <!-- 用量趋势 -->
    <div class="chart-section" v-if="usage.length">
      <h2>近30天用量趋势</h2>
      <div class="chart-bar-wrap">
        <div class="chart-bar" v-for="item in usage" :key="item.date"
          :style="{ height: barHeight(item.call_count) + '%' }"
          :title="`${item.date}: ${item.call_count}次`">
          <span class="bar-label">{{ item.call_count }}</span>
        </div>
      </div>
      <div class="chart-legend">
        <span v-for="item in usage.slice(0, 7)" :key="item.date">{{ item.date.slice(5) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
const dashboard = ref({ stats: {}, enterprise: {} });
const enterprise = ref({});
const usage = ref([]);
const loading = ref(true);

const typeLabel = computed(() => {
  const map = { enterprise: '企业', agent: '代理商', partner: '合作伙伴' };
  return map[dashboard.value.enterprise?.type] || '-';
});
const planLabel = computed(() => {
  const map = { free: '免费版', ent_starter: '入门版', ent_pro: '专业版', ent_ultimate: '旗舰版' };
  return map[dashboard.value.enterprise?.planType] || dashboard.value.enterprise?.planType || '-';
});

onMounted(async () => {
  try {
    const [dashRes, profileRes] = await Promise.all([
      $fetch('/api/enterprise/dashboard', { credentials: 'include' }),
      $fetch('/api/enterprise/profile', { credentials: 'include' }),
    ]);
    dashboard.value = dashRes.data || dashRes;
    enterprise.value = profileRes.data || profileRes;
    usage.value = dashboard.value.usage || [];
  } catch (e) {
    console.error('Dashboard load failed:', e);
  } finally {
    loading.value = false;
  }
});

function formatNumber(n) {
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

function barHeight(count) {
  const max = Math.max(...usage.value.map(u => u.call_count), 1);
  return Math.max((count / max) * 100, 4);
}

definePageMeta({ layout: 'enterprise' });
</script>

<style scoped>
.page-title { font-size: 24px; margin: 0 0 24px; color: #1a1a2e; }

.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 28px; }
.stat-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.stat-label { font-size: 13px; color: #888; margin-bottom: 8px; }
.stat-value { font-size: 28px; font-weight: 700; color: #1a1a2e; }

.info-section { background: #fff; border-radius: 12px; padding: 24px; margin-bottom: 28px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.info-section h2 { font-size: 16px; margin: 0 0 16px; color: #333; }
.info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.info-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
.info-item .label { color: #888; }
.plan-badge { background: #e8f0fe; color: #1a73e8; padding: 2px 10px; border-radius: 12px; font-size: 12px; }

.chart-section { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.chart-section h2 { font-size: 16px; margin: 0 0 20px; color: #333; }
.chart-bar-wrap { display: flex; align-items: flex-end; gap: 3px; height: 160px; padding: 0 4px; }
.chart-bar { flex: 1; background: linear-gradient(to top, #667eea, #764ba2); border-radius: 4px 4px 0 0; min-width: 12px; position: relative; transition: height 0.3s; }
.bar-label { position: absolute; top: -20px; left: 50%; transform: translateX(-50%); font-size: 10px; color: #666; white-space: nowrap; }
.chart-legend { display: flex; gap: 3px; margin-top: 8px; padding: 0 4px; }
.chart-legend span { flex: 1; font-size: 10px; color: #999; text-align: center; min-width: 12px; }
</style>
