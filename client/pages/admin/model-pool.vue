<template>
  <div class="admin-model-pool">
    <header class="page-header">
      <h1>{{ $t('admin_model_pool.全局统一模型池') }}</h1>
      <p>{{ $t('admin_model_pool.统一管理文生图_文生视频_llm_tts_音频模型_权重_灰度_配额_熔断') }}</p>
    </header>

    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card" v-for="cat in categories" :key="cat.key">
        <div class="stat-num">{{ getCategoryCount(cat.key) }}</div>
        <div class="stat-label">{{ cat.label }}</div>
      </div>
    </div>

    <!-- 操作栏 -->
    <div class="toolbar">
      <select v-model="filterCategory">
        <option value="">{{ $t('common.all_categories') }}</option>
        <option v-for="cat in categories" :key="cat.key" :value="cat.key">{{ cat.label }}</option>
      </select>
      <button class="btn-primary" @click="refreshPool">{{ $t('common.refresh') }}{{ $t('common.add_model_pool') }}</button>
    </div>

    <!-- 模型列表 -->
    <table class="model-table" v-if="filteredModels.length">
      <thead>
        <tr>
          <th>{{ $t('admin_model_pool.模型标识') }}</th><th>{{ $t('common.name') }}</th><th>{{ $t('admin_model_pool.厂商') }}</th><th>{{ $t('admin_model_pool.类别') }}</th><th>{{ $t('admin_model_pool.权重') }}</th><th>{{ $t('admin_model_pool.灰度') }}</th><th>{{ $t('common.status') }}</th><th>{{ $t('common.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="m in filteredModels" :key="m.model_key" :class="{ disabled: !m.enabled }">
          <td><code>{{ m.model_key }}</code></td>
          <td>{{ m.display_name }}</td>
          <td>{{ m.vendor }}</td>
          <td><span class="cat-tag" :class="m.category">{{ categoryLabel(m.category) }}</span></td>
          <td><input type="number" v-model.number="m.pool_weight" min="1" max="100" style="width:60px" @change="updateWeight(m)" /></td>
          <td><input type="range" v-model.number="m.gray_percent" min="0" max="100" @change="updateGray(m)" /> {{ m.gray_percent || 0 }}%</td>
          <td><span :class="['status-dot', m.enabled ? 'on' : 'off']"></span> {{ m.enabled ? $t('common.statusEnabled') : $t('common.statusDisabled') }}</td>
          <td>
            <button class="btn-sm" @click="toggleModel(m)">{{ m.enabled ? $t('common.statusDisabled') : $t('common.statusEnabled') }}</button>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-else class="empty">{{ $t('admin_model_pool.暂无模型') }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

definePageMeta({ layout: 'platform-admin', middleware: ['auth'] })

const models = ref([]);
const filterCategory = ref('');
const categories = [
  { key: 'image', label: '文生图' },
  { key: 'video', label: '文生视频' },
  { key: 'text', label: '大语言模型' },
  { key: 'voice', label: '语音合成' },
  { key: 'audio', label: '音频处理' },
];

const filteredModels = computed(() => {
  if (!filterCategory.value) return models.value;
  return models.value.filter(m => m.category === filterCategory.value);
});

function getCategoryCount(cat) {
  return models.value.filter(m => m.category === cat && m.enabled === 1).length;
}

function categoryLabel(cat) {
  return categories.find(c => c.key === cat)?.label || cat;
}

async function refreshPool() {
  try {
    const res = await $fetch('/api/admin/model-pool');
    if (res?.data) models.value = res.data.map(m => ({ ...m, pool_weight: m.pool_weight || 1, gray_percent: m.gray_percent || 0 }));
  } catch (e) { /* ignore */ }
}

async function updateWeight(model) {
  try {
    await $fetch(`/api/admin/models/config/${model.model_key}`, {
      method: 'PUT', body: { pool_weight: model.pool_weight },
    });
    refreshPool();
  } catch (e) { /* ignore */ }
}

async function updateGray(model) {
  try {
    await $fetch(`/api/admin/model-pool/${model.model_key}/gray`, {
      method: 'PUT', body: { percent: model.gray_percent || 0 },
    });
  } catch (e) { /* ignore */ }
}

async function toggleModel(model) {
  try {
    await $fetch(`/api/admin/models/config/${model.model_key}/toggle`, {
      method: 'PATCH', body: { enabled: !model.enabled },
    });
    refreshPool();
  } catch (e) { /* ignore */ }
}

onMounted(refreshPool);
</script>

<style scoped>
.admin-model-pool { max-width: 1200px; margin: 0 auto; padding: 24px; }
.page-header h1 { font-size: 24px; margin: 0; }
.page-header p { color: var(--text-secondary); margin-top: 4px; }

.stats-row { display: flex; gap: 16px; margin: 20px 0; }
.stat-card { flex: 1; background: #fff; border-radius: 8px; padding: 16px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.stat-num { font-size: 28px; font-weight: 700; color: var(--brand); }
.stat-label { font-size: 13px; color: var(--text-secondary); margin-top: 4px; }

.toolbar { display: flex; gap: 12px; margin-bottom: 16px; }
.toolbar select { padding: 8px 12px; border: 1px solid var(--border-light); border-radius: 6px; }
.btn-primary { padding: 8px 16px; background: var(--brand); color: #fff; border: none; border-radius: 6px; cursor: pointer; }

.model-table { width: 100%; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.model-table th, .model-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--border-light); font-size: 13px; }
.model-table th { background: var(--bg-page); font-weight: 600; }
tr.disabled { opacity: 0.5; }

.cat-tag { padding: 2px 8px; border-radius: 4px; font-size: 11px; }
.cat-tag.image { background: var(--info-bg); color: var(--info); }
.cat-tag.video { background: var(--danger-light); color: #c62828; }
.cat-tag.text { background: var(--success-light); color: var(--success); }
.cat-tag.voice { background: #fff3e0; color: #e65100; }
.cat-tag.audio { background: #f3e5f5; color: #7b1fa2; }

.status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; }
.status-dot.on { background: var(--success); }
.status-dot.off { background: #ccc; }

.btn-sm { padding: 4px 10px; background: var(--bg-hover); border: 1px solid var(--border-light); border-radius: 4px; cursor: pointer; font-size: 12px; }
.empty { text-align: center; padding: 60px; color: #999; }
</style>
