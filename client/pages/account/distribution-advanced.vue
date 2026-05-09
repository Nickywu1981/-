<template>
  <div class="adv-dist-page">
    <header class="page-header">
      <h1>分销进阶中心</h1>
      <p>推广等级 · 团队业绩 · 推广素材 · 裂变活动</p>
    </header>

    <!-- Tier Card -->
    <div v-if="tierData" class="tier-card" :class="tierData.tier">
      <div class="tier-badge">{{ tierData.label }}</div>
      <div class="tier-stats">
        <div class="tier-stat">
          <span class="ts-label">累计业绩</span>
          <span class="ts-value">¥{{ tierData.totalSales || 0 }}</span>
        </div>
        <div class="tier-stat">
          <span class="ts-label">佣金加成</span>
          <span class="ts-value">+{{ tierData.rateBonus }}%</span>
        </div>
        <div class="tier-stat">
          <span class="ts-label">二级分佣</span>
          <span class="ts-value">{{ tierData.level2Enabled ? '已开启' : '未开启' }}</span>
        </div>
      </div>
      <div class="tier-progress">
        <div class="tp-bar">
          <div class="tp-fill" :style="{ width: nextTierProgress + '%' }"></div>
        </div>
        <span class="tp-label">{{ nextTierLabel }}</span>
      </div>
    </div>

    <!-- Tabs -->
    <div class="section-tabs">
      <button v-for="t in subTabs" :key="t.key" :class="['stab', { active: activeSub === t.key }]" @click="activeSub = t.key">{{ t.label }}</button>
    </div>

    <!-- Team Performance -->
    <div v-if="activeSub === 'performance'" class="panel">
      <div v-if="perfLoading" class="loading">加载中...</div>
      <div v-else-if="!perfData?.members?.length" class="empty">暂无团队成员</div>
      <div v-else>
        <div class="perf-summary">
          <span>团队 {{ perfData.totalMembers }} 人</span>
          <span>总贡献 ¥{{ perfData.totalContribution || 0 }}</span>
        </div>
        <div class="perf-list">
          <div v-for="m in perfData.members" :key="m.id" class="perf-row">
            <span class="pf-name">{{ m.nickname || '匿名用户' }}</span>
            <span class="pf-level">L{{ m.level }}</span>
            <span class="pf-contrib">¥{{ m.contributed || 0 }}</span>
            <span class="pf-date">{{ formatDate(m.bound_at) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Promo Assets -->
    <div v-if="activeSub === 'promo'" class="panel">
      <div v-if="promoLoading" class="loading">加载中...</div>
      <div v-else-if="!promoData" class="empty">暂无推广素材</div>
      <div v-else>
        <div class="invite-link-box">
          <label>邀请链接</label>
          <div class="link-row">
            <code>{{ promoData.invite_url }}</code>
            <button class="btn-sm" @click="copyText(promoData.invite_url)">复制</button>
          </div>
          <label>邀请码：<strong>{{ promoData.invite_code }}</strong></label>
        </div>
        <div v-if="promoData.assets?.length" class="assets-grid">
          <div v-for="a in promoData.assets" :key="a.key" class="asset-card">
            <div class="asset-icon">{{ a.type === 'image' ? '🖼️' : '📝' }}</div>
            <div class="asset-label">{{ a.label }}</div>
            <div v-if="a.content" class="asset-content">{{ a.content }}</div>
            <button v-if="a.content" class="btn-sm" @click="copyText(a.content)">复制文案</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Campaigns -->
    <div v-if="activeSub === 'campaigns'" class="panel">
      <div v-if="campLoading" class="loading">加载中...</div>
      <div v-else-if="!campData?.campaigns?.length" class="empty">暂无进行中的活动</div>
      <div v-else>
        <div class="campaigns-list">
          <div v-for="c in campData.campaigns" :key="c.id" class="camp-card" :class="{ active: c.active }">
            <div class="camp-header">
              <span class="camp-title">{{ c.title }}</span>
              <span :class="['camp-badge', c.active ? 'active' : 'ended']">{{ c.active ? '进行中' : '已结束' }}</span>
            </div>
            <p class="camp-desc">{{ c.description }}</p>
            <div v-if="c.id === 'invite_3_reward'" class="camp-progress">
              <span>本月已邀请：{{ campData.progress?.monthlyInvites || 0 }}/{{ campData.progress?.targetForVIP || 3 }}</span>
              <div class="mini-bar"><div class="mini-fill" :style="{ width: Math.min(100, ((campData.progress?.monthlyInvites || 0) / (campData.progress?.targetForVIP || 3)) * 100) + '%' }"></div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
;
const toast = useToast();

const subTabs = [
  { key: 'performance', label: '团队业绩' },
  { key: 'promo', label: '推广素材' },
  { key: 'campaigns', label: '裂变活动' },
];

const activeSub = ref('performance');
const tierData = ref(null);
const perfData = ref(null);
const promoData = ref(null);
const campData = ref(null);
const perfLoading = ref(false);
const promoLoading = ref(false);
const campLoading = ref(false);

const tiers = [
  { key: 'bronze', label: '铜牌推广', minSales: 0 },
  { key: 'silver', label: '银牌推广', minSales: 5000 },
  { key: 'gold', label: '金牌推广', minSales: 20000 },
  { key: 'diamond', label: '钻石合伙人', minSales: 100000 },
];

const nextTierLabel = computed(() => {
  const t = tierData.value;
  if (!t) return '';
  const idx = tiers.findIndex(ti => ti.key === t.tier);
  if (idx < tiers.length - 1) {
    const next = tiers[idx + 1];
    const remaining = next.minSales - t.totalSales;
    return `距${next.label}还需 ¥${remaining}`;
  }
  return '已达最高等级';
});

const nextTierProgress = computed(() => {
  const t = tierData.value;
  if (!t) return 0;
  const idx = tiers.findIndex(ti => ti.key === t.tier);
  if (idx >= tiers.length - 1) return 100;
  const prev = tiers[idx].minSales;
  const next = tiers[idx + 1].minSales;
  const range = next - prev;
  const progress = t.totalSales - prev;
  return Math.min(100, Math.max(0, (progress / range) * 100));
});

async function loadTier() {
  try {
    const resp = await $fetch('/api/distribution/tier', { credentials: 'include' });
    tierData.value = resp.data || resp;
  } catch {}
}

async function loadPerformance() {
  perfLoading.value = true;
  try {
    const resp = await $fetch('/api/distribution/performance', { credentials: 'include' });
    perfData.value = resp.data || resp;
  } catch { /* silent */ } finally { perfLoading.value = false; }
}

async function loadPromo() {
  promoLoading.value = true;
  try {
    const resp = await $fetch('/api/distribution/promo', { credentials: 'include' });
    promoData.value = resp.data || resp;
  } catch { /* silent */ } finally { promoLoading.value = false; }
}

async function loadCampaigns() {
  campLoading.value = true;
  try {
    const resp = await $fetch('/api/distribution/campaigns', { credentials: 'include' });
    campData.value = resp.data || resp;
  } catch { /* silent */ } finally { campLoading.value = false; }
}

watch(activeSub, (val) => {
  if (val === 'performance') loadPerformance();
  else if (val === 'promo') loadPromo();
  else if (val === 'campaigns') loadCampaigns();
});

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast.success('已复制'); } catch { toast.error('复制失败'); }
}

function formatDate(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : ''; }

onMounted(() => { loadTier(); loadPerformance(); });
</script>

<style scoped>
.adv-dist-page { max-width: 960px; margin: 0 auto; padding: 24px; }
.page-header { margin-bottom: 20px; }
.page-header h1 { font-size: 24px; font-weight: 700; color: var(--text-primary); margin: 0 0 6px; }
.page-header p { color: var(--text-secondary); font-size: 14px; margin: 0; }

.tier-card { background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 16px; padding: 24px; color: #fff; margin-bottom: 24px; }
.tier-card.bronze { background: linear-gradient(135deg, #a8a8a8, #8b8b8b); }
.tier-card.silver { background: linear-gradient(135deg, #b8c6db, #a0aec0); }
.tier-card.gold { background: linear-gradient(135deg, #f6d365, #fda085); }
.tier-card.diamond { background: linear-gradient(135deg, #667eea, #764ba2); }
.tier-badge { font-size: 20px; font-weight: 800; margin-bottom: 16px; }
.tier-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 16px; }
.tier-stat { display: flex; flex-direction: column; }
.ts-label { font-size: 12px; opacity: 0.8; }
.ts-value { font-size: 18px; font-weight: 700; }
.tier-progress { display: flex; align-items: center; gap: 12px; }
.tp-bar { flex: 1; height: 8px; background: rgba(255,255,255,0.3); border-radius: 4px; overflow: hidden; }
.tp-fill { height: 100%; background: rgba(255,255,255,0.9); border-radius: 4px; transition: width 0.5s; }
.tp-label { font-size: 12px; white-space: nowrap; }

.section-tabs { display: flex; gap: 8px; margin-bottom: 20px; }
.stab { padding: 8px 18px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-card); color: var(--text-secondary); cursor: pointer; font-size: 13px; }
.stab.active { background: var(--brand); color: #fff; border-color: var(--brand); }

.panel { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; }
.loading, .empty { text-align: center; padding: 40px 0; color: var(--text-tertiary); }

.perf-summary { display: flex; gap: 24px; margin-bottom: 16px; font-size: 13px; color: var(--text-secondary); }
.perf-list { display: flex; flex-direction: column; gap: 8px; }
.perf-row { display: flex; align-items: center; gap: 16px; padding: 10px 12px; background: var(--bg-hover); border-radius: 8px; font-size: 13px; }
.pf-name { flex: 1; color: var(--text-primary); font-weight: 500; }
.pf-level { color: var(--brand); font-weight: 600; }
.pf-contrib { color: var(--text-primary); font-weight: 600; }
.pf-date { color: var(--text-tertiary); font-size: 12px; }

.invite-link-box { background: var(--bg-hover); border-radius: 8px; padding: 16px; margin-bottom: 16px; }
.invite-link-box label { font-size: 13px; color: var(--text-secondary); display: block; margin-bottom: 6px; }
.link-row { display: flex; gap: 8px; align-items: center; margin-bottom: 10px; }
.link-row code { flex: 1; padding: 8px; background: var(--bg-card); border-radius: 4px; font-size: 12px; word-break: break-all; }

.assets-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.asset-card { border: 1px solid var(--border-color); border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
.asset-icon { font-size: 24px; }
.asset-label { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.asset-content { font-size: 12px; color: var(--text-secondary); line-height: 1.5; }
.btn-sm { padding: 4px 12px; border-radius: 4px; font-size: 12px; cursor: pointer; background: var(--brand); color: #fff; border: none; }

.campaigns-list { display: flex; flex-direction: column; gap: 12px; }
.camp-card { border: 1px solid var(--border-color); border-radius: 10px; padding: 16px; }
.camp-card.active { border-color: var(--brand); }
.camp-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.camp-title { font-size: 15px; font-weight: 700; color: var(--text-primary); }
.camp-badge { font-size: 11px; padding: 2px 8px; border-radius: 10px; }
.camp-badge.active { background: #e6f7e6; color: #52c41a; }
.camp-badge.ended { background: #f5f5f5; color: #999; }
.camp-desc { font-size: 13px; color: var(--text-secondary); margin: 0 0 10px; }
.camp-progress { font-size: 12px; color: var(--text-secondary); }
.mini-bar { height: 6px; background: var(--bg-hover); border-radius: 3px; margin-top: 4px; overflow: hidden; }
.mini-fill { height: 100%; background: var(--brand); border-radius: 3px; transition: width 0.5s; }
</style>
