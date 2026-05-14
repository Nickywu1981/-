<template>
  <AdminLayout>
    <h2 class="ptitle">{{ $t('admin_badges.page_title') }}</h2>

    <div class="toolbar">
      <select v-model="filterCategory" class="sel" @change="fetchData">
        <option value="">{{ $t('admin_badges.all_categories') }}</option>
        <option value="sales">{{ $t('admin_badges.category_sales') }}</option>
        <option value="promotion">{{ $t('admin_badges.category_promotion') }}</option>
        <option value="trust">{{ $t('admin_badges.category_trust') }}</option>
        <option value="cross_border">{{ $t('admin_badges.category_cross_border') }}</option>
      </select>
      <button class="btn btn-primary" @click="openCreate">{{ $t('admin_badges.new_badge') }}</button>
    </div>

    <LoadingSkeleton v-if="loading" type="table" :rows="5" :cols="6" />

    <div class="table-wrap" v-else-if="list.length">
    <table class="table">
      <thead>
        <tr><th>{{ $t('common.id') }}</th><th>{{ $t('admin_badges.col_icon') }}</th><th>{{ $t('admin_badges.col_name') }}</th><th>{{ $t('admin_badges.col_color') }}</th><th>{{ $t('admin_badges.col_category') }}</th><th>{{ $t('common.status') }}</th><th>{{ $t('admin_badges.col_sort') }}</th><th>{{ $t('common.action') }}</th></tr>
      </thead>
      <tbody>
        <tr v-for="b in list" :key="b.id">
          <td>{{ b.id }}</td>
          <td><span class="badge-preview" :style="{ background: b.color }">{{ iconMap[b.icon] || '🏷️' }}</span></td>
          <td>{{ b.name }}</td>
          <td><span class="color-swatch" :style="{ background: b.color }" />{{ b.color }}</td>
          <td><span class="category-tag">{{ categoryLabel(b.category) }}</span></td>
          <td><span class="status-dot" :class="b.status === 1 ? 'on' : 'off'" />{{ b.status === 1 ? $t('common.enable') : $t('common.disable') }}</td>
          <td>{{ b.sort_order }}</td>
          <td class="actions">
            <button class="btn-sm" @click="openEdit(b)">{{ $t('admin_badges.edit') }}</button>
            <button class="btn-sm" :class="b.status === 1 ? 'warn' : 'success'" @click="toggleStatus(b)">{{ b.status === 1 ? $t('admin_badges.disable') : $t('admin_badges.enable') }}</button>
            <button class="btn-sm danger" @click="confirmDelete(b)">{{ $t('admin_badges.delete') }}</button>
          </td>
        </tr>
      </tbody>
    </table>
    </div>

    <Pagination v-if="total > pageSize" :page="page" :page-size="pageSize" :total="total" @change="onPageChange" />

    <div v-if="!list.length && !loading" class="empty">{{ $t('admin_badges.empty') }}</div>

    <Teleport to="body">
      <div class="modal-overlay" v-if="showModal" @click.self="showModal = false" @keydown.escape="showModal = false">
        <div class="modal">
          <h3>{{ editing.id ? $t('admin_badges.edit_modal') : $t('admin_badges.create_modal') }}</h3>
          <div class="form-row">
            <div class="form-group">
              <label>{{ $t('admin_badges.label_name') }}</label>
              <input v-model="form.name" maxlength="100" type="text" :placeholder="$t('admin_badges.name_placeholder')" />
            </div>
            <div class="form-group">
              <label>{{ $t('admin_badges.label_icon_code') }}</label>
              <input v-model="form.icon" maxlength="50" type="text" :placeholder="$t('admin_badges.icon_placeholder')" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>{{ $t('admin_badges.label_color') }}</label>
              <input v-model="form.color" type="color" />
            </div>
            <div class="form-group">
              <label>{{ $t('admin_badges.label_category') }}</label>
              <select v-model="form.category" class="sel">
                <option value="">{{ $t('admin_badges.select_category') }}</option>
                <option value="sales">{{ $t('admin_badges.category_sales') }}</option>
                <option value="promotion">{{ $t('admin_badges.category_promotion') }}</option>
                <option value="trust">{{ $t('admin_badges.category_trust') }}</option>
                <option value="cross_border">{{ $t('admin_badges.category_cross_border') }}</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>{{ $t('admin_badges.label_desc') }}</label>
              <input v-model="form.description" maxlength="500" type="text" :placeholder="$t('admin_badges.desc_placeholder')" />
            </div>
            <div class="form-group">
              <label>{{ $t('admin_badges.label_sort') }}</label>
              <input v-model.number="form.sortOrder" type="number" :placeholder="$t('admin_badges.sort_placeholder')" />
            </div>
          </div>
          <div class="form-group">
            <label><input v-model="form.status" type="checkbox" :true-value="1" :false-value="0" /> {{ $t('admin_badges.label_enable') }}</label>
          </div>
          <div class="modal-actions">
            <button class="btn" @click="showModal = false">{{ $t('common.cancel') }}</button>
            <button class="btn btn-primary" @click="save">{{ $t('common.save') }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </AdminLayout>
</template>

<script setup lang="ts">

const { t } = useI18n()
const { confirm } = useConfirm()

const toast = useToast()
const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const loading = ref(false);
const showModal = ref(false);
const filterCategory = ref('');
const editing = ref<any>({});

const iconMap: Record<string, string> = {
  fire: '🔥', star: '⭐', clock: '⏰', discount: '🏷️',
  shield: '🛡️', undo: '↩️', global: '🌍', plane: '✈️', gift: '🎁',
};

const form = reactive({
  name: '', icon: 'star', color: '#FF4757', category: 'sales',
  description: '', sortOrder: 0, status: 1,
});

onMounted(() => { fetchData(); });

async function fetchData() {
  loading.value = true;
  try {
    const params = new URLSearchParams({ page: String(page.value), pageSize: String(pageSize) });
    if (filterCategory.value) params.set('category', filterCategory.value);
    const res = await $fetch(`/api/badges/admin/all?${params}`, { credentials: 'include' });
    const body = (res as any).data || res;
    list.value = body?.list || body || [];
    if (!Array.isArray(list.value)) list.value = [];
    total.value = body?.total || 0;
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || e?.message || t('common.loadFail')) } finally { loading.value = false; }

}

function onPageChange(p: number) { page.value = p; fetchData() }

function openCreate() {
  editing.value = {};
  Object.assign(form, { name: '', icon: 'star', color: '#FF4757', category: 'sales', description: '', sortOrder: 0, status: 1 });
  showModal.value = true;
}

function openEdit(b: any) {
  editing.value = b;
  Object.assign(form, {
    name: b.name, icon: b.icon, color: b.color, category: b.category,
    description: b.description || '', sortOrder: b.sort_order, status: b.status,
  });
  showModal.value = true;
}

async function save() {
  try {
    const body: any = { ...form };
    if (editing.value.id) {
      await $fetch(`/api/badges/admin/${editing.value.id}`, {
        method: 'PUT',
        credentials: 'include',
        body: JSON.stringify(body),
      });
    } else {
      await $fetch('/api/badges/admin', {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify(body),
      });
    }
    showModal.value = false;
    fetchData();
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(t('admin_badges.save_failed', { msg: err?.data?.msg || err.message || t('admin_badges.network_error') })); }
}

async function toggleStatus(b: any) {
  try {
    await $fetch(`/api/badges/admin/${b.id}`, {
      method: 'PUT',
      credentials: 'include',
      body: JSON.stringify({ status: b.status === 1 ? 0 : 1 }),
    });
    fetchData();
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(t('admin_badges.op_failed', { msg: err?.data?.msg || err.message || t('admin_badges.network_error') })); }
}

async function confirmDelete(b: any) {
  if (!await confirm({ message: t('admin_badges.confirm_delete', { name: b.name }) })) return;
  try {
    await $fetch(`/api/badges/admin/${b.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    fetchData();
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(t('admin_badges.delete_failed', { msg: err?.data?.msg || err.message || t('admin_badges.network_error') })); }
}

function categoryLabel(c: string) {
  const map: Record<string, string> = {
    sales: t('admin_badges.category_sales'),
    promotion: t('admin_badges.category_promotion'),
    trust: t('admin_badges.category_trust'),
    cross_border: t('admin_badges.category_cross_border'),
  };
  return map[c] || c;
}
definePageMeta({ layout: 'platform-admin', middleware: ['auth'] })
</script>

<style scoped>
.ptitle { font-size: 20px; font-weight: 700; margin-bottom: 20px; color: var(--text-primary); }
.toolbar { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
.sel { padding: 6px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); background: var(--bg-card); color: var(--text-primary); font-size: 13px; outline: none; }
.btn { padding: 6px 14px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 13px; transition: border-color var(--transition-fast), color var(--transition-fast); }
.btn:hover { border-color: var(--brand); color: var(--brand); }
.btn-primary { background: var(--brand); color: var(--text-on-brand); border-color: var(--brand); }
.btn-primary:hover { opacity: 0.9; color: var(--text-on-brand); }
.btn-sm { padding: 4px 10px; font-size: 12px; border: 1px solid var(--input-border); border-radius: var(--radius-xs); cursor: pointer; margin-right: 4px; background: var(--bg-card); color: var(--text-primary); transition: border-color var(--transition-fast), color var(--transition-fast); }
.btn-sm:hover { border-color: var(--brand); color: var(--brand); }
.btn-sm.success { background: var(--success); color: var(--text-on-brand); border-color: var(--success); }
.btn-sm.danger { background: var(--danger); color: var(--text-on-brand); border-color: var(--danger); }
.btn-sm.warn { background: var(--warning); color: var(--text-on-brand); border-color: var(--warning); }
.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; background: var(--bg-card); border-radius: var(--radius-lg); overflow: hidden; }
.table th, .table td { padding: 10px 12px; border-bottom: 1px solid var(--table-border); text-align: left; font-size: 14px; }
.table th { background: var(--table-header-bg); font-weight: 600; color: var(--text-secondary); }
tr:hover td { background: var(--table-row-hover); }
.badge-preview { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; font-size: 16px; }
.color-swatch { display: inline-block; width: 16px; height: 16px; border-radius: 4px; margin-right: 6px; vertical-align: middle; border: 1px solid var(--input-border); }
.category-tag { font-size: 12px; padding: 2px 8px; border-radius: var(--badge-radius); background: var(--status-processing-bg); color: var(--status-processing-text); }
.status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
.status-dot.on { background: var(--success); }
.status-dot.off { background: var(--text-muted); }
.empty { text-align: center; color: var(--text-muted); padding: 40px; }

.modal-overlay { position: fixed; inset: 0; background: var(--modal-overlay); display: flex; align-items: center; justify-content: center; z-index: 999; }
.modal { background: var(--bg-card); border-radius: var(--modal-radius); padding: var(--modal-padding); width: 90%; max-width: 540px; max-height: 90vh; overflow-y: auto; box-shadow: var(--modal-shadow); }
.modal h3 { margin-bottom: 16px; color: var(--text-primary); font-size: 17px; font-weight: 600; }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 4px; }
.form-group input, .form-group select { width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 14px; background: var(--bg-input); color: var(--text-primary); outline: none; }
.form-group input:focus, .form-group select:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.form-row { display: flex; gap: 12px; }
.form-row .form-group { flex: 1; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }
.actions { white-space: nowrap; }
</style>
