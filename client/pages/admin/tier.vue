<template>
  <AdminLayout>
    <h2 class="ptitle">会员等级管理</h2>
    <LoadingSkeleton v-if="loading" type="card" :rows="4" />
    <template v-else-if="tierData">
      <div class="tier-overview">
        <div class="tier-card" :class="'tier-'+tierData.tier">
          <span class="tier-icon">{{ tierIcon(tierData.tier) }}</span>
          <span class="tier-name">{{ tierLabel(tierData.tier) }}</span>
        </div>
        <div class="limits-grid">
          <div v-for="(val, key) in tierData.limits" :key="key" class="limit-card">
            <span class="limit-val">{{ val === -1 ? '∞' : val }}</span>
            <span class="limit-lbl">{{ limitLabel(key as string) }}</span>
          </div>
        </div>
      </div>
      <div class="section" v-if="exportPerms">
        <h3>{{ $t('common.export') }}权限</h3>
        <div class="perm-cards">
          <div class="perm-card" :class="{ on: exportPerms.exportHd }">
            <span class="perm-icon">{{ exportPerms.exportHd ? '✅' : '❌' }}</span>
            <span>高清{{ $t('common.export') }}</span>
          </div>
          <div class="perm-card" :class="{ on: exportPerms.noWatermark }">
            <span class="perm-icon">{{ exportPerms.noWatermark ? '✅' : '❌' }}</span>
            <span>无水印{{ $t('common.export') }}</span>
          </div>
        </div>
      </div>
      <div class="section">
        <h3>用量查询</h3>
        <div class="check-row">
          <select v-model="checkType" class="sel"><option value="image">图片</option><option value="video">视频</option><option value="text">文案</option></select>
          <button class="btn-primary" :disabled="checkingLimit" @click="doCheckLimit">{{ checkingLimit ? '查询中...' : '查询' }}</button>
        </div>
        <div v-if="limitResult" class="limit-result">
          <div class="limit-item"><span>已用</span><strong>{{ limitResult.used || 0 }}</strong></div>
          <div class="limit-item"><span>上限</span><strong>{{ limitResult.limit === -1 ? '∞' : limitResult.limit }}</strong></div>
          <div class="limit-item"><span>剩余</span><strong :class="{ warn: limitResult.remaining < 10 }">{{ limitResult.remaining === -1 ? '∞' : limitResult.remaining }}</strong></div>
        </div>
      </div>
    </template>
    <EmptyState v-else icon="⭐" title="暂无会员数据" description="请先登录后查看会员等级信息" />
  </AdminLayout>
</template>
<script setup lang="ts">

const loading = ref(true), tierData = ref<any>(null), exportPerms = ref<any>(null)
const checkType = ref('image'), limitResult = ref<any>(null), checkingLimit = ref(false)

function tierLabel(t: string) { return { free:'免费版', pro:'专业版', enterprise:'企业版' }[t] || t || '未知' }
function tierIcon(t: string) { return { free:'🌱', pro:'⭐', enterprise:'💎' }[t] || '📦' }
function limitLabel(k: string) {
  return { dailyImage:'每日图片', dailyVideo:'每日视频', maxImageSize:'图片大小上限', maxVideoDuration:'视频时长上限',
    concurrentTasks:'并发任务', maxBatchSize:'批量上限', templateAccess:'模板权限', apiAccess:'API访问' }[k] || k
}
const toast = useToast()

onMounted(async () => {
  try {
    const [tRes, pRes]: any[] = await Promise.all([
      $fetch('/api/tier/my', { credentials: 'include' }),
      $fetch('/api/tier/export-permission', { credentials: 'include' }),
    ])
    if (tRes?.code === 200) tierData.value = tRes.data
    if (pRes?.code === 200) exportPerms.value = pRes.data
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || '加载失败') }
  loading.value = false
})

async function doCheckLimit() {
  checkingLimit.value = true;
  try {
    const data: any = await $fetch(`/api/tier/check-limit?type=${checkType.value}`, { credentials: 'include' })
    if (data?.code === 200) limitResult.value = data.data
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || '加载失败') } finally { checkingLimit.value = false; }
}
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>
<style scoped>
h2 { font-size: 22px; font-weight: 700; color: var(--text-primary); margin-bottom: 20px; }
h3 { font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px; }
.tier-overview { display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 24px; align-items: flex-start; }
.tier-card { background: var(--bg-card); border: 2px solid var(--border-light); border-radius: var(--radius-xl); padding: 28px 32px; text-align: center; min-width: 140px; display: flex; flex-direction: column; gap: 8px; }
.tier-card.tier-pro { border-color: var(--brand); background: var(--brand-light); }
.tier-card.tier-enterprise { border-color: var(--warning); background: var(--warning-light); }
.tier-icon { font-size: 36px; }
.tier-name { font-size: 18px; font-weight: 700; color: var(--text-primary); }
.limits-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; flex: 1; }
.limit-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 14px 16px; text-align: center; display: flex; flex-direction: column; gap: 2px; }
.limit-val { font-size: 22px; font-weight: 700; color: var(--brand); }
.limit-lbl { font-size: 12px; color: var(--text-muted); }
.section { margin-bottom: 24px; background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 20px; }
.perm-cards { display: flex; gap: 12px; flex-wrap: wrap; }
.perm-card { display: flex; align-items: center; gap: 8px; padding: 10px 18px; border: 1px solid var(--border-light); border-radius: var(--radius-md); font-size: 14px; color: var(--text-muted); }
.perm-card.on { color: var(--text-primary); border-color: var(--success); background: var(--success-light); }
.perm-icon { font-size: 16px; }
.check-row { display: flex; gap: 8px; align-items: center; margin-bottom: 12px; }
.sel { padding: 7px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--bg-card); color: var(--text-primary); outline: none; }
.btn-primary { padding: 8px 20px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; white-space: nowrap; }
.btn-primary:hover { opacity: 0.9; }
.limit-result { display: flex; gap: 16px; flex-wrap: wrap; }
.limit-item { display: flex; flex-direction: column; gap: 2px; font-size: 12px; color: var(--text-muted); min-width: 80px; }
.limit-item strong { font-size: 18px; color: var(--text-primary); }
.limit-item strong.warn { color: var(--danger); }
</style>
