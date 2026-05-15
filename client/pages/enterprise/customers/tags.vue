<template>
  <div class="ent-tags">
    <div class="page-header">
      <h1 class="page-title">{{ $t('enterprise.customers.tags.title') }}</h1>
      <button class="btn-primary" @click="showAdd = true">+ {{ $t('enterprise.customers.tags.createTag') }}</button>
    </div>

    <div class="tag-grid" v-if="!loading">
      <div v-for="t in tags" :key="t.id" class="tag-card">
        <div class="tag-preview" :style="{ background: t.color }">{{ t.name }}</div>
        <div class="tag-info">
          <span class="tag-name">{{ t.name }}</span>
          <span class="tag-color">{{ t.color }}</span>
        </div>
        <div class="tag-actions">
          <button class="btn-sm" @click="editTag(t)">{{ $t('enterprise.customers.tags.edit') }}</button>
          <button class="btn-sm danger" @click="handleDelete(t)">{{ $t('enterprise.customers.tags.delete') }}</button>
        </div>
      </div>
      <div v-if="!tags.length" class="empty">{{ $t('enterprise.customers.tags.noTags') }}</div>
    </div>
    <div v-if="loading" class="loading-spinner">{{ $t('enterprise.common.loading') }}</div>

    <!-- 新建/编辑弹窗 -->
    <div class="modal-overlay" v-if="showAdd || showEdit" @click.self="closeModal">
      <div class="modal">
        <h3>{{ showEdit ? $t('enterprise.customers.tags.editTag') : $t('enterprise.customers.tags.newTag') }}</h3>
        <div class="form-group">
          <label>{{ $t('enterprise.customers.tags.tagName') }}</label>
          <input v-model="form.name" :placeholder="$t('enterprise.customers.tags.tagNamePlaceholder')" class="form-input" maxlength="50" />
        </div>
        <div class="form-group">
          <label>{{ $t('enterprise.customers.tags.tagColor') }}</label>
          <div class="color-row">
            <input type="color" v-model="form.color" class="color-picker" />
            <span class="color-hex">{{ form.color }}</span>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-text" @click="closeModal">{{ $t('enterprise.common.cancel') }}</button>
          <button class="btn-primary" @click="submitForm">{{ showEdit ? $t('enterprise.common.save') : $t('enterprise.customers.tags.create') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] });

const { t } = useI18n()
const { confirm } = useConfirm()
const toast = useToast()
const tags = ref([]);
const loading = ref(true);
const showAdd = ref(false);
const showEdit = ref(false);
const editingId = ref(null);
const form = reactive({ name: '', color: '#3B82F6' });

const $api = (url, opts) => $fetch(url, { baseURL: '/api/enterprise/customers', credentials: 'include', ...opts });

async function loadTags() {
  loading.value = true;
  try { tags.value = await $api('/tags'); } catch (e) { toast.error(t('enterprise.customers.tags.loadFailed')) }
  loading.value = false;
}

function editTag(t) {
  editingId.value = t.id;
  form.name = t.name;
  form.color = t.color;
  showEdit.value = true;
}

function closeModal() {
  showAdd.value = false;
  showEdit.value = false;
  editingId.value = null;
  form.name = '';
  form.color = '#3B82F6';
}

async function submitForm() {
  try {
    if (showEdit.value) {
      await $api(`/tags/${editingId.value}`, { method: 'PUT', body: { name: form.name, color: form.color } });
    } else {
      await $api('/tags', { method: 'POST', body: { name: form.name, color: form.color } });
    }
    closeModal();
    loadTags();
  } catch (e) { toast.error(t('enterprise.customers.tags.saveFailed')) }
}

async function handleDelete(t) {
  if (!(await confirm({ message: t('enterprise.customers.tags.confirmDelete', { name: t.name }) }))) return;
  try {
    await $api(`/tags/${t.id}`, { method: 'DELETE' });
    loadTags();
  } catch (e) { toast.error(t('enterprise.customers.tags.deleteFailed')) }
}

onMounted(loadTags);
</script>

<style scoped>
.ent-tags { max-width: 960px; margin: 0 auto; padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-title { font-size: 24px; font-weight: 700; }
.tag-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
.tag-card { background: var(--bg-card); border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.1); display: flex; flex-direction: column; gap: 12px; }
.tag-preview { padding: 12px; border-radius: 6px; color: var(--text-on-brand); font-weight: 600; text-align: center; font-size: 16px; }
.tag-info { display: flex; justify-content: space-between; font-size: 13px; color: var(--text-secondary); }
.tag-actions { display: flex; gap: 8px; justify-content: flex-end; }
.btn-sm { padding: 4px 10px; font-size: 13px; border: 1px solid var(--border-light); border-radius: 4px; background: var(--bg-card); cursor: pointer; }
.btn-sm.danger { color: var(--danger); border-color: var(--danger); }
.btn-primary { padding: 8px 20px; background: var(--info); color: var(--text-on-brand); border: none; border-radius: 6px; cursor: pointer; }
.btn-text { padding: 8px 16px; border: 1px solid var(--border-light); border-radius: 6px; background: var(--bg-card); cursor: pointer; }
.empty { text-align: center; padding: 48px; color: var(--text-muted); grid-column: 1 / -1; }
.modal-overlay { position: fixed; inset: 0; background: var(--bg-overlay); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: var(--bg-card); border-radius: 12px; padding: 24px; min-width: 380px; }
.modal h3 { margin-bottom: 16px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; }
.form-input { width: 100%; padding: 8px 12px; border: 1px solid var(--border-light); border-radius: 6px; }
.color-row { display: flex; align-items: center; gap: 12px; }
.color-picker { width: 40px; height: 36px; border: none; cursor: pointer; }
.color-hex { font-size: 14px; color: var(--text-secondary); }
.modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px; }
</style>
