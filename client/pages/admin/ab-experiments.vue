<template>
  <AdminLayout>
    <div class="page">
      <div class="page-header">
        <div>
          <h1>{{ $t('admin_ab.page_title') }}</h1>
          <p>{{ $t('admin_ab.page_desc') }}</p>
        </div>
        <button class="btn btn-primary" @click="showCreate = true">{{ $t('admin_ab.create_btn') }}</button>
      </div>

      <!-- 状态筛选 -->
      <div class="filter-bar">
        <button v-for="s in statuses" :key="s.key" :class="['btn', filterStatus === s.key ? 'btn-primary' : '']" @click="filterStatus = s.key">
          {{ s.label }}
        </button>
      </div>

      <!-- 实验列表 -->
      <div class="exp-list" v-if="experiments.length > 0">
        <div v-for="exp in filteredExps" :key="exp.id" class="exp-card" @click="selectExperiment(exp)">
          <div class="exp-main">
            <div class="exp-title">
              <span class="exp-name">{{ exp.name }}</span>
              <span :class="['badge', 'badge-' + exp.status]">{{ statusLabel(exp.status) }}</span>
            </div>
            <div class="exp-meta">
              <span>{{ exp.variants?.length || 0 }} {{ $t('admin_ab.variant') }}</span>
              <span>{{ exp.metrics?.length || 0 }} {{ $t('admin_ab.col_metric') }}</span>
              <span>{{ exp.target_type }}</span>
            </div>
          </div>
          <div class="exp-actions" @click.stop>
            <button v-if="exp.status === 'draft' || exp.status === 'paused'" class="btn btn-sm" @click="startExp(exp.id)">{{ $t('admin_ab.start_btn') }}</button>
            <button v-if="exp.status === 'running'" class="btn btn-sm" @click="pauseExp(exp.id)">{{ $t('admin_ab.pause_btn') }}</button>
            <button v-if="exp.status === 'running' || exp.status === 'paused'" class="btn btn-sm" @click="completeExp(exp.id)">{{ $t('admin_ab.complete_btn') }}</button>
          </div>
        </div>
      </div>
      <div v-else class="empty">{{ $t('admin_ab.empty_hint') }}</div>

      <!-- 选中实验 → 结果显示 -->
      <div v-if="selected" class="results-section">
        <h2>{{ selected.name }}{{ $t('admin_ab.results_suffix') }}</h2>
        <div class="result-actions">
          <select v-model="resultsDays" @change="loadResults" class="input">
            <option value="1">{{ $t('admin_ab.days_1') }}</option>
            <option value="3">{{ $t('admin_ab.days_3') }}</option>
            <option value="7">{{ $t('admin_ab.days_7') }}</option>
            <option value="14">{{ $t('admin_ab.days_14') }}</option>
            <option value="30">{{ $t('admin_ab.days_30') }}</option>
          </select>
          <button class="btn" @click="loadResults">{{ $t('admin_ab.refresh') }}</button>
        </div>

        <!-- 指标对比 -->
        <div v-if="results" class="result-grid">
          <!-- 变体汇总 -->
          <table class="data-table">
            <thead><tr><th>{{ $t('admin_ab.variant') }}</th><th v-for="m in selected.metrics" :key="m.metricId">{{ m.name }}</th></tr></thead>
            <tbody>
            <tr v-for="v in results.variants" :key="v.variantId">
              <td><strong>{{ v.label }}</strong></td>
              <td v-for="m in selected.metrics" :key="m.metricId">
                {{ formatMetric(v.metrics[m.metricId], m) }}
              </td>
            </tr>
            </tbody>
          </table>

          <!-- 显著性 -->
          <div class="comparisons">
            <h3>{{ $t('admin_ab.comparison_title') }}</h3>
            <table class="data-table" v-if="results.comparisons.length > 0">
              <thead><tr><th>{{ $t('admin_ab.col_metric') }}</th><th>{{ $t('admin_ab.col_winner') }}</th><th>{{ $t('admin_ab.col_compared') }}</th><th>{{ $t('admin_ab.col_winner_mean') }}</th><th>{{ $t('admin_ab.col_compared_mean') }}</th><th>{{ $t('admin_ab.col_pvalue') }}</th><th>{{ $t('admin_ab.col_significant') }}</th></tr></thead>
              <tbody>
              <tr v-for="c in results.comparisons" :key="`${c.metricId}-${c.comparedVariant}`">
                <td>{{ c.metric }}</td>
                <td class="best">{{ c.bestVariant }}</td>
                <td>{{ c.comparedVariant }}</td>
                <td>{{ c.bestMean }}</td>
                <td>{{ c.otherMean }}</td>
                <td :class="{ 'p-sig': c.significant }">{{ c.pValue }}</td>
                <td>{{ c.significant ? '✅ ' + $t('admin_ab.significant_yes') : '—' }}</td>
              </tr>
              </tbody>
            </table>
            <p v-else class="hint">{{ $t('admin_ab.no_data_hint') }}</p>
          </div>
        </div>
      </div>

      <!-- 创建/编辑弹窗 -->
      <div v-if="showCreate" class="modal-mask" @click.self="showCreate = false" @keydown.escape="showCreate = false">
        <div class="modal">
          <h2>{{ $t('admin_ab.modal_create') }}</h2>
          <div class="form-group">
            <label>{{ $t('admin_ab.label_name') }}</label><input v-model="form.name" class="input" :placeholder="$t('admin_ab.placeholder_name')" />
          </div>
          <div class="form-group">
            <label>{{ $t('admin_ab.label_desc') }}</label><textarea v-model="form.description" class="input" rows="2" :placeholder="$t('admin_ab.placeholder_desc')" />
          </div>
          <div class="form-group">
            <label>{{ $t('admin_ab.label_target_type') }}</label>
            <select v-model="form.targetType" class="input">
              <option value="model">{{ $t('admin_ab.target_model') }}</option>
              <option value="template">{{ $t('admin_ab.target_template') }}</option>
              <option value="prompt">{{ $t('admin_ab.target_prompt') }}</option>
              <option value="full_workflow">{{ $t('admin_ab.target_full_workflow') }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>{{ $t('admin_ab.label_variants') }}</label>
            <div v-for="(v, i) in form.variants" :key="i" class="variant-row">
              <input v-model="v.variantId" class="input input-sm" :placeholder="$t('admin_ab.placeholder_variant_id')" />
              <input v-model="v.modelKey" class="input input-sm" :placeholder="$t('admin_ab.placeholder_model_key')" />
              <input v-model="v.description" class="input input-sm" :placeholder="$t('admin_ab.placeholder_desc_short')" />
              <input v-model.number="v.weight" class="input input-sm" type="number" :placeholder="$t('admin_ab.placeholder_weight')" style="width:64px" />
              <button v-if="i >= 2" class="btn btn-sm" @click="form.variants.splice(i, 1)">✕</button>
            </div>
            <button class="btn" @click="form.variants.push({variantId:'',modelKey:'',description:'',weight:50})">{{ $t('admin_ab.add_variant') }}</button>
          </div>
          <div class="form-group">
            <label>{{ $t('admin_ab.label_metrics') }}</label>
            <div v-for="(m, i) in form.metrics" :key="i" class="metric-row">
              <input v-model="m.metricId" class="input input-sm" :placeholder="$t('admin_ab.placeholder_metric_id')" />
              <input v-model="m.name" class="input input-sm" :placeholder="$t('admin_ab.placeholder_metric_name')" />
              <select v-model="m.type" class="input input-sm">
                <option value="conversion">{{ $t('admin_ab.metric_conversion') }}</option>
                <option value="quality">{{ $t('admin_ab.metric_quality') }}</option>
                <option value="latency">{{ $t('admin_ab.metric_latency') }}</option>
              </select>
              <button v-if="i >= 1" class="btn btn-sm" @click="form.metrics.splice(i, 1)">✕</button>
            </div>
            <button class="btn" @click="form.metrics.push({metricId:'',name:'',type:'conversion'})">{{ $t('admin_ab.add_metric') }}</button>
          </div>
          <div class="modal-actions">
            <button class="btn" @click="showCreate = false">{{ $t('admin_ab.cancel') }}</button>
            <button class="btn btn-primary" :disabled="saving" @click="create">{{ saving ? $t('admin_ab.saving') : $t('admin_ab.create_submit') }}</button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
const toast = useToast();
const { t } = useI18n();

const experiments = ref<any[]>([]);
const selected = ref<any>(null);
const results = ref<any>(null);
const resultsDays = ref(7);
const filterStatus = ref('');
const showCreate = ref(false);
const saving = ref(false);
const statuses = [{ key: '', label: t('admin_ab.status_all') }, { key: 'running', label: t('admin_ab.status_running') }, { key: 'draft', label: t('admin_ab.status_draft') }, { key: 'paused', label: t('admin_ab.status_paused') }, { key: 'completed', label: t('admin_ab.status_completed') }];

const form = ref({ name: '', description: '', targetType: 'model', variants: [
  { variantId: 'control', modelKey: '', description: t('admin_ab.control_group'), weight: 50 },
  { variantId: 'treatment', modelKey: '', description: t('admin_ab.treatment_group'), weight: 50 },
], metrics: [
  { metricId: 'success_rate', name: t('admin_ab.metric_success_rate'), type: 'conversion' },
  { metricId: 'latency', name: t('admin_ab.metric_avg_latency'), type: 'latency' },
]});

const filteredExps = computed(() => {
  if (!filterStatus.value) return experiments.value;
  return experiments.value.filter(e => e.status === filterStatus.value);
});

function statusLabel(s: string) {
  const map: Record<string, string> = { draft: t('admin_ab.status_draft'), running: t('admin_ab.status_running'), paused: t('admin_ab.status_paused'), completed: t('admin_ab.status_completed') };
  return map[s] || s;
}

function formatMetric(m: any, def: any) {
  if (!m) return '—';
  if (def.type === 'latency') return `${Math.round(m.mean * 100) / 100}ms`;
  if (def.type === 'conversion') return `${Math.round((m.mean || 0) * 10000) / 100}%`;
  return `${Math.round(m.mean * 100) / 100}`;
}

async function fetchExperiments() {
  try {
    const data: any = await $fetch('/api/admin/experiments' + (filterStatus.value ? `?status=${filterStatus.value}` : ''), { credentials: 'include' });
    experiments.value = data.data || [];
  } catch (e: any) { toast.error(e?.data?.msg || t('admin_ab.toast_load_fail')); }
}

async function selectExperiment(exp: any) { selected.value = exp; await loadResults(); }

async function loadResults() {
  if (!selected.value) return;
  try {
    const data: any = await $fetch(`/api/admin/experiments/${selected.value.id}/results?days=${resultsDays.value}`, { credentials: 'include' });
    results.value = data.data;
  } catch (e: any) { toast.error(e?.data?.msg || t('admin_ab.toast_data_fail')); }
}

async function create() {
  if (!form.value.name.trim()) return toast.error(t('admin_ab.toast_enter_name'));
  saving.value = true;
  try {
    await $fetch('/api/admin/experiments', { method: 'POST', credentials: 'include', body: form.value });
    toast.success(t('admin_ab.toast_create_success'));
    showCreate.value = false;
    fetchExperiments();
  } catch (e: any) { toast.error(e?.data?.msg || t('admin_ab.toast_create_fail')); }
  finally { saving.value = false; }
}

async function startExp(id: number) { await action(id, 'start'); }
async function pauseExp(id: number) { await action(id, 'pause'); }
async function completeExp(id: number) { await action(id, 'complete'); }

async function action(id: number, action: string) {
  try {
    await $fetch(`/api/admin/experiments/${id}/${action}`, { method: 'POST', credentials: 'include' });
    toast.success(t('admin_ab.toast_action_success'));
    fetchExperiments();
  } catch (e: any) { toast.error(e?.data?.msg || t('admin_ab.toast_action_fail')); }
}

onMounted(fetchExperiments);
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.page { max-width: 1000px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.page-header h1 { font-size: 22px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
.page-header p { font-size: 14px; color: var(--text-secondary); margin: 0; }
.filter-bar { display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap; }
.exp-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px; }
.exp-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: border-color 0.15s; }
.exp-card:hover { border-color: var(--brand); }
.exp-main { flex: 1; }
.exp-title { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.exp-name { font-weight: 600; font-size: 15px; color: var(--text-primary); }
.exp-meta { font-size: 12px; color: var(--text-tertiary); display: flex; gap: 12px; }
.exp-actions { display: flex; gap: 6px; flex-shrink: 0; }
.badge { font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 500; }
.badge-draft { background: #e2e8f0; color: #475569; }
.badge-running { background: #dcfce7; color: #166534; }
.badge-paused { background: #fef3c7; color: #92400e; }
.badge-completed { background: #dbeafe; color: #1e40af; }
.results-section { background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: 20px; margin-top: 8px; }
.results-section h2 { margin: 0 0 12px; font-size: 18px; }
.result-actions { display: flex; gap: 8px; margin-bottom: 16px; }
.result-grid { display: flex; flex-direction: column; gap: 20px; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table th, .data-table td { padding: 8px 12px; border-bottom: 1px solid var(--border); text-align: left; }
.data-table th { font-weight: 600; color: var(--text-secondary); background: var(--bg); }
.best { color: var(--brand); font-weight: 600; }
.p-sig { color: #16a34a; font-weight: 600; }
.comparisons h3 { font-size: 15px; margin: 0 0 8px; }
.hint { font-size: 13px; color: var(--text-tertiary); }
.empty { text-align: center; padding: 48px 0; color: var(--text-tertiary); font-size: 14px; }
.variant-row, .metric-row { display: flex; gap: 8px; margin-bottom: 6px; align-items: center; }
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; z-index: 300; }
.modal { background: var(--bg-card); border-radius: 16px; padding: 28px 32px; width: 640px; max-height: 80vh; overflow-y: auto; box-shadow: 0 8px 40px rgba(0,0,0,0.15); }
.modal h2 { margin: 0 0 16px; font-size: 18px; }
.form-group { margin-bottom: 14px; }
.form-group label { display: block; font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 4px; }
.modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; }
.input { padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg); color: var(--text-primary); font-size: 14px; box-sizing: border-box; width: 100%; }
.input:focus { border-color: var(--brand); outline: none; }
.input-sm { width: auto; flex: 1; min-width: 80px; }
.btn { padding: 6px 16px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg); color: var(--text-primary); cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; gap: 4px; }
.btn:hover { border-color: var(--brand); color: var(--brand); }
.btn-primary { background: var(--brand); color: #fff; border-color: var(--brand); }
.btn-primary:hover { background: var(--brand-dark); color: #fff; }
.btn-sm { padding: 4px 10px; font-size: 12px; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
