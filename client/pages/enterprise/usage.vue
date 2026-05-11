<template>
  <div class="ent-usage">
    <h1 class="page-title">{{ $t('enterprise.usage.title') }}</h1>

    <!-- 日期筛选 -->
    <div class="toolbar">
      <input type="date" v-model="startDate" class="date-input" />
      <span class="sep">{{ $t('enterprise.usage.to') }}</span>
      <input type="date" v-model="endDate" class="date-input" />
      <select v-model="filterUserId" class="filter-select">
        <option value="">{{ $t('enterprise.usage.allUsers') }}</option>
        <option v-for="u in userList" :key="u.user_id" :value="u.user_id">{{ u.nickname || `${$t('enterprise.usage.userPrefix')}${u.user_id}` }}</option>
      </select>
      <button class="btn-text" @click="loadUsage">{{ $t('enterprise.usage.query') }}</button>
    </div>

    <!-- 按日趋势 -->
    <div class="section" v-if="timeline.length">
      <h2>{{ $t('enterprise.usage.callTrend') }}</h2>
      <table>
        <thead><tr><th>{{ $t('enterprise.usage.date') }}</th><th>{{ $t('enterprise.usage.callCount') }}</th><th>{{ $t('enterprise.usage.creditsUsed') }}</th></tr></thead>
        <tbody>
          <tr v-for="item in timeline" :key="item.date">
            <td>{{ item.date }}</td>
            <td>{{ item.call_count }}</td>
            <td>{{ item.total_credits || 0 }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 按用户统计 -->
    <div class="section" v-if="byUser.length">
      <h2>{{ $t('enterprise.usage.byUser') }}</h2>
      <table>
        <thead><tr><th>{{ $t('enterprise.usage.userId') }}</th><th>{{ $t('enterprise.usage.callCount') }}</th><th>{{ $t('enterprise.usage.creditsUsed') }}</th></tr></thead>
        <tbody>
          <tr v-for="item in byUser" :key="item.user_id">
            <td>{{ item.user_id }}</td>
            <td>{{ item.call_count }}</td>
            <td>{{ item.total_credits || 0 }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="!timeline.length && !loading" class="empty">{{ $t('enterprise.usage.noData') }}</div>
  </div>
</template>

<script setup>
const toast = useToast();
const { t } = useI18n();
const startDate = ref(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
const endDate = ref(new Date().toISOString().slice(0, 10));
const filterUserId = ref('');
const timeline = ref([]);
const byUser = ref([]);
const userList = ref([]);
const loading = ref(true);

onMounted(() => loadUsage());

async function loadUsage() {
  loading.value = true;
  try {
    const params = { startDate: startDate.value, endDate: endDate.value };
    if (filterUserId.value) params.userId = filterUserId.value;
    const res = await $fetch('/api/enterprise/usage', { credentials: 'include', params });
    timeline.value = res.data?.timeline || [];
    byUser.value = res.data?.byUser || [];
  } catch (e) { toast.error(t('enterprise.usage.loadError')); }
  finally { loading.value = false; }
}

definePageMeta({ layout: 'enterprise' });
</script>

<style scoped>
.page-title { font-size: 24px; margin: 0 0 20px; color: #1a1a2e; }
.toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 20px; }
.date-input { padding: 8px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; }
.sep { color: #999; font-size: 14px; }
.filter-select { padding: 8px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; background: #fff; }
.btn-text { padding: 8px 16px; background: #f0f0f0; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; }

.section { background: #fff; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.section h2 { font-size: 16px; margin: 0 0 14px; color: #333; }
table { width: 100%; border-collapse: collapse; }
.table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
th, td { padding: 10px 14px; text-align: left; font-size: 14px; border-bottom: 1px solid #f0f0f0; }
th { background: #fafafa; color: #666; font-weight: 500; }
.empty { text-align: center; padding: 60px; color: #999; font-size: 15px; }
</style>
