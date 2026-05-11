<template>
  <div class="ent-usage">
    <h1 class="page-title">用量明细</h1>

    <!-- 日期筛选 -->
    <div class="toolbar">
      <input type="date" v-model="startDate" class="date-input" />
      <span class="sep">至</span>
      <input type="date" v-model="endDate" class="date-input" />
      <select v-model="filterUserId" class="filter-select">
        <option value="">全部用户</option>
        <option v-for="u in userList" :key="u.user_id" :value="u.user_id">{{ u.nickname || `用户${u.user_id}` }}</option>
      </select>
      <button class="btn-text" @click="loadUsage">查询</button>
    </div>

    <!-- 按日趋势 -->
    <div class="section" v-if="timeline.length">
      <h2>调用趋势</h2>
      <table>
        <thead><tr><th>日期</th><th>调用次数</th><th>消耗积分</th></tr></thead>
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
      <h2>按用户统计</h2>
      <table>
        <thead><tr><th>用户ID</th><th>调用次数</th><th>消耗积分</th></tr></thead>
        <tbody>
          <tr v-for="item in byUser" :key="item.user_id">
            <td>{{ item.user_id }}</td>
            <td>{{ item.call_count }}</td>
            <td>{{ item.total_credits || 0 }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="!timeline.length && !loading" class="empty">暂无用量数据</div>
  </div>
</template>

<script setup>
import { useToast } from '~/composables/useToast';
const toast = useToast();
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
  } catch (e) { toast.error('用量明细加载失败'); }
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
