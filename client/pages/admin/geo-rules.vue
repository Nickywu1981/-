<template>
  <AdminLayout>
    <div class="page">
      <div class="page-header">
        <h1>{{ $t('admin_geo_rules.page_title') }}</h1>
        <p>{{ $t('admin_geo_rules.page_subtitle') }}</p>
        <button class="btn btn-primary" @click="openCreate">{{ showForm ? $t('common.cancel') : '+ ' + $t('common.geo_new_rule') }}</button>
      </div>

      <!-- Create/Edit Form -->
      <div v-if="showForm" class="form-card">
        <h3>{{ editingId ? $t('common.geo_edit_rule') : $t('common.geo_new_rule') }}</h3>
        <div class="form-grid">
          <label>{{ $t('admin_geo_rules.rule_name') }} <input v-model="form.rule_name" maxlength="100" class="input" :placeholder="$t('common.example') || '如：欧盟合规规则'" /></label>
          <label>{{ $t('admin_geo_rules.country_code') }} <input v-model="form.country_codes_str" class="input" :placeholder="'逗号分隔: CN,US,JP'" /></label>
          <label>{{ $t('admin_geo_rules.platform_code') }} <input v-model="form.platform_codes_str" class="input" :placeholder="'逗号分隔: amazon,temu (可选)'" /></label>
          <label>{{ $t('admin_geo_rules.force_locale') }} <select v-model="form.locale" class="input"><option value="">{{ $t('admin_geo_rules.auto') }}</option><option value="zh">zh</option><option value="en">en</option><option value="es">es</option></select></label>
          <label>{{ $t('common.statusDisabled') }}模型 <input v-model="form.blocked_models_str" class="input" placeholder="逗号分隔: dall-e-3 (可选)" /></label>
          <label>{{ $t('admin_geo_rules.review_level') }} {{ form.review_level }} <input v-model.number="form.review_level" type="range" min="0" max="5" class="range" /></label>
          <label>{{ $t('admin_geo_rules.priority') }} <input v-model.number="form.priority" type="number" min="0" max="100" class="input" /></label>
          <label>{{ $t('common.statusEnabled') }} <input v-model="form.enabled" type="checkbox" :true-value="1" :false-value="0" /></label>
        </div>
        <label>{{ $t('common.description') }} <input v-model="form.description" maxlength="500" class="input" :placeholder="$t('common.geo_rule_desc_placeholder')" /></label>
        <div class="form-actions">
          <button class="btn btn-primary" :disabled="saving" @click="save">{{ saving ? $t('admin_geo_rules.saving') : $t('admin_geo_rules.save') }}</button>
          <button class="btn" @click="cancelForm">{{ $t('common.cancel') }}</button>
        </div>
      </div>

      <div v-if="loading" class="loading">{{ $t('common.loading') }}</div>
      <div v-else class="table-wrap">
        <table>
          <thead><tr>
            <th>{{ $t('admin_geo_rules.rule_name') }}</th><th>{{ $t('admin_geo_rules.country') }}</th><th>{{ $t('admin_geo_rules.language') }}</th><th>{{ $t('common.statusDisabled') }} {{ $t('common.model') }}</th><th>{{ $t('admin_geo_rules.review_level') }}</th><th>{{ $t('admin_geo_rules.priority') }}</th><th>{{ $t('common.status') }}</th><th>{{ $t('common.actions') }}</th>
          </tr></thead>
          <tbody>
            <tr v-for="r in rules" :key="r.id">
              <td><strong>{{ r.rule_name }}</strong></td>
              <td>{{ fmtArr(r.country_codes) }}</td>
              <td>{{ r.locale || $t('admin_geo_rules.auto') }}</td>
              <td>{{ fmtArr(r.blocked_models) || $t('admin_geo_rules.none') }}</td>
              <td>{{ r.review_level }}</td>
              <td>{{ r.priority }}</td>
              <td><span :class="['badge', r.enabled ? 'on' : 'off']">{{ r.enabled ? $t('admin_geo_rules.enabled') : $t('admin_geo_rules.disabled') }}</span></td>
              <td class="actions">
                <button class="btn btn-sm" @click="openEdit(r)">{{ $t('common.edit') }}</button>
                <button class="btn btn-sm btn-danger" @click="remove(r.id)">{{ $t('common.delete') }}</button>
              </td>
            </tr>
            <tr v-if="rules.length === 0"><td colspan="8" class="empty">{{ $t('common.geo_empty') }}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">const { t } = useI18n()

const { confirm } = useConfirm();
const toast = useToast();
const rules = ref<any[]>([]);
const loading = ref(true);
const saving = ref(false);
const showForm = ref(false);
const editingId = ref<number | null>(null);
const form = reactive({
  rule_name: '', country_codes_str: '', platform_codes_str: '', locale: '',
  blocked_models_str: '', review_level: 1, priority: 0, enabled: 1, description: '',
});

function fmtArr(v: any) {
  if (!v) return '';
  try {
    const arr = typeof v === 'string' ? JSON.parse(v) : v;
    return Array.isArray(arr) ? arr.join(', ') : String(v);
  } catch {
    return String(v);
  }
}

async function fetchRules() {
  loading.value = true;
  try {
    const data: any = await $fetch('/api/admin/geo-rules', { credentials: 'include' });
    rules.value = data.data || data;
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || t('common.loadFail')); }
  finally { loading.value = false; }
}

function openCreate() {
  editingId.value = null;
  Object.assign(form, { rule_name: '', country_codes_str: '', platform_codes_str: '', locale: '', blocked_models_str: '', review_level: 1, priority: 0, enabled: 1, description: '' });
  showForm.value = true;
}

function openEdit(r: any) {
  editingId.value = r.id;
  Object.assign(form, {
    rule_name: r.rule_name, country_codes_str: fmtArr(r.country_codes), platform_codes_str: fmtArr(r.platform_codes),
    locale: r.locale || '', blocked_models_str: fmtArr(r.blocked_models), review_level: r.review_level || 0,
    priority: r.priority || 0, enabled: r.enabled ?? 1, description: r.description || '',
  });
  showForm.value = true;
}

function cancelForm() { showForm.value = false; editingId.value = null; }

async function save() {
  const body: any = {
    rule_name: form.rule_name, country_codes: form.country_codes_str.split(',').map((s: string) => s.trim()).filter(Boolean),
    locale: form.locale || null, review_level: form.review_level, priority: form.priority,
    enabled: form.enabled, description: form.description,
  };
  if (form.platform_codes_str) body.platform_codes = form.platform_codes_str.split(',').map((s: string) => s.trim()).filter(Boolean);
  if (form.blocked_models_str) body.blocked_models = form.blocked_models_str.split(',').map((s: string) => s.trim()).filter(Boolean);

  saving.value = true;
  try {
    if (editingId.value) {
      await $fetch(`/api/admin/geo-rules/${editingId.value}`, { method: 'PUT', credentials: 'include', body });
      toast.success(t('common.success_update'));
    } else {
      await $fetch('/api/admin/geo-rules', { method: 'POST', credentials: 'include', body });
      toast.success(t('common.success_create'));
    }
    cancelForm();
    fetchRules();
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || t('common.failed_save')); }
  finally { saving.value = false; }
}

async function remove(id: number) {
  if (!await confirm({ message: t('common.confirm_delete_item') })) return;
  try {
    await $fetch(`/api/admin/geo-rules/${id}`, { method: 'DELETE', credentials: 'include' });
    toast.success(t('common.delete_success'));
    fetchRules();
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || t('common.failed_delete')); }
}

onMounted(fetchRules);
definePageMeta({ layout: 'platform-admin', middleware: ['auth'] })
</script>

<style scoped>
.page { max-width: 1100px; }
.page-header { margin-bottom: 24px; display: flex; flex-wrap: wrap; align-items: center; gap: 16px; }
.page-header h1 { font-size: 22px; font-weight: 700; color: var(--text-primary); margin: 0; }
.page-header p { font-size: 14px; color: var(--text-secondary); margin: 0; flex: 1 1 100%; }
.form-card { background: var(--bg-card); border: 1px dashed var(--brand); border-radius: 10px; padding: 20px; margin-bottom: 20px; }
.form-card h3 { margin: 0 0 12px; font-size: 16px; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; margin-bottom: 12px; }
.form-grid label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: var(--text-secondary); }
.form-actions { display: flex; gap: 8px; margin-top: 12px; }
.range { width: 100%; }
.table-wrap { background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; overflow: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { padding: 10px 14px; text-align: left; border-bottom: 1px solid var(--border); white-space: nowrap; }
th { background: var(--bg-hover); font-weight: 600; color: var(--text-secondary); font-size: 12px; }
.actions { display: flex; gap: 6px; }
.badge { padding: 2px 10px; border-radius: 10px; font-size: 11px; }
.badge.on { background: var(--success-light); color: var(--success); }
.badge.off { background: var(--bg-hover); color: var(--text-tertiary); }
.empty { text-align: center; color: var(--text-tertiary); padding: 32px; }
.loading { text-align: center; padding: 48px; color: var(--text-secondary); }
.input { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg); color: var(--text-primary); font-size: 14px; box-sizing: border-box; }
.input:focus { border-color: var(--brand); outline: none; }
.btn { padding: 6px 16px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg); color: var(--text-primary); cursor: pointer; font-size: 13px; }
.btn:hover { border-color: var(--brand); color: var(--brand); }
.btn-sm { padding: 4px 12px; font-size: 12px; }
.btn-primary { background: var(--brand); color: #fff; border-color: var(--brand); }
.btn-primary:hover { background: var(--brand-dark); color: #fff; }
.btn-danger { color: var(--danger) !important; border-color: var(--danger) !important; }
.btn-danger:hover { background: var(--danger) !important; color: #fff !important; }
</style>
