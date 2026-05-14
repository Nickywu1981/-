<template>
  <AdminLayout>
    <div class="page">
      <div class="page-header">
        <h1>站点配置</h1>
        <p>控制用户端页面{{ $t('common.name') }}、功能、内容，修改后用户端立即生效</p>
        <button class="btn btn-primary" @click="showAddForm = !showAddForm">{{ showAddForm ? '取消' : '+ 新增配置' }}</button>
      </div>

      <!-- Add form -->
      <div v-if="showAddForm" class="add-form">
        <input v-model="newConfig.key" maxlength="50" placeholder="配置键名 (如 hero_title)" class="input" />
        <select v-model="newConfig.type" class="input sel">
          <option value="">请选择{{ $t('common.type') }}</option>
          <option value="text">text</option>
          <option value="json">json</option>
        </select>
        <input v-model="newConfig.description" maxlength="500" placeholder="描述说明" class="input" />
        <textarea v-model="newConfig.value" maxlength="2000" :placeholder="newConfig.type === 'json' ? 'JSON 值' : '文本值'" class="input textarea" :rows="newConfig.type === 'json' ? 6 : 2" />
        <button class="btn btn-primary" :disabled="adding" @click="addConfig">{{ adding ? '添加中...' : '确认添加' }}</button>
      </div>

      <div v-if="loading" class="loading">{{ $t('common.loading') }}</div>
      <div v-else-if="loadError" class="error">
        <p>{{ loadError }}</p>
        <button class="btn btn-primary" @click="fetchConfig">重试</button>
      </div>

      <div v-else class="config-grid">
        <div v-for="item in configs" :key="item.id" class="config-card" :class="{ editing: editingId === item.id }">
          <div class="card-header">
            <div class="card-title">
              <span class="key-badge">{{ item.config_key }}</span>
              <span class="type-badge">{{ item.config_type }}</span>
            </div>
            <span class="desc">{{ item.description }}</span>
          </div>

          <!-- Display state -->
          <template v-if="editingId !== item.id">
            <div v-if="item.config_type === 'text'" class="value-display">{{ item.config_value }}</div>
            <pre v-else class="value-display json">{{ formatJson(item.config_value) }}</pre>
            <button class="btn btn-sm" @click="startEdit(item)">{{ $t('common.edit') }}</button>
            <button class="btn btn-sm btn-danger" @click="deleteConfig(item)">{{ $t('common.delete') }}</button>
          </template>

          <!-- Editing state -->
          <template v-else-if="editingId === item.id">
            <textarea
              v-if="item.config_type === 'json'"
              v-model="editValue"
              maxlength="2000"
              class="input textarea"
              rows="8"
            />
            <input v-else v-model="editValue" maxlength="2000" class="input" />
            <div class="edit-actions">
              <button class="btn btn-primary btn-sm" :disabled="saving" @click="save(item)">{{ saving ? '保存中...' : '保存' }}</button>
              <button class="btn btn-sm" @click="cancelEdit">{{ $t('common.cancel') }}</button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">const { t } = useI18n()


const { confirm } = useConfirm()

const configs = ref<any[]>([]);
const editingId = ref<number | null>(null);
const editValue = ref('');
const loading = ref(true);
const loadError = ref('');
const saving = ref(false);
const adding = ref(false);
const showAddForm = ref(false);
const newConfig = reactive({ key: '', value: '', type: 'text', description: '' });
const toast = useToast();

async function fetchConfig() {
  loading.value = true;
  loadError.value = '';
  try {
    const data: any = await $fetch('/api/admin/site-config', { credentials: 'include' });
    configs.value = data.data || data;
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string };
    loadError.value = err?.data?.msg || err.message || '加载失败';
  } finally { loading.value = false; }
}

function startEdit(item: any) {
  editingId.value = item.id;
  editValue.value = item.config_value || '';
}

function cancelEdit() {
  editingId.value = null;
  editValue.value = '';
}

async function save(item: any) {
  saving.value = true;
  try {
    await $fetch(`/api/admin/site-config/${item.config_key}`, {
      method: 'PUT', credentials: 'include',
      body: { value: editValue.value, type: item.config_type, description: item.description }
    });
    item.config_value = editValue.value;
    toast.success(t('common.success_save'));
    editingId.value = null;
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string };
    toast.error(err?.data?.msg || err.message || '保存失败');
  } finally { saving.value = false; }
}

async function addConfig() {
  if (!newConfig.key || !newConfig.value) return toast.warn('键名和值不能为空');
  adding.value = true;
  try {
    await $fetch('/api/admin/site-config', {
      method: 'POST', credentials: 'include',
      body: { key: newConfig.key, value: newConfig.value, type: newConfig.type, description: newConfig.description }
    });
    toast.success('添加成功');
    showAddForm.value = false;
    newConfig.key = ''; newConfig.value = ''; newConfig.description = '';
    fetchConfig();
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || err.message || '添加失败'); }
  finally { adding.value = false; }
}

async function deleteConfig(item: any) {
  if (!await confirm({ message: `确定删除配置 "${item.config_key}"？`} )) return;
  try {
    await $fetch(`/api/admin/site-config/${item.id}`, { method: 'DELETE', credentials: 'include' });
    toast.success(t('common.delete_success'));
    fetchConfig();
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || err.message || '删除失败'); }
}

function formatJson(val: string) {
  try { return JSON.stringify(JSON.parse(val), null, 2); }
  catch { return val; }
}

onMounted(fetchConfig);
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.page { max-width: 960px; }
.page-header { margin-bottom: 24px; display: flex; flex-wrap: wrap; align-items: center; gap: 16px; }
.page-header h1 { font-size: 22px; font-weight: 700; color: var(--text-primary); margin: 0; }
.page-header p { font-size: 14px; color: var(--text-secondary); margin: 0; flex: 1 1 100%; }
.add-form {
  display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end;
  padding: 16px; margin-bottom: 20px;
  background: var(--bg-card); border: 1px dashed var(--brand); border-radius: 10px;
}
.add-form .input { flex: 1 1 160px; min-width: 140px; }
.add-form .sel { flex: 0 0 80px; min-width: 80px; }
.add-form .textarea { flex: 1 1 300px; }
.btn-danger { color: var(--danger) !important; border-color: var(--danger) !important; }
.btn-danger:hover { background: var(--danger) !important; color: #fff !important; }
.loading, .error { text-align: center; padding: 48px; color: var(--text-secondary); }
.config-grid { display: flex; flex-direction: column; gap: 12px; }
.config-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px 20px;
  transition: border-color .2s, box-shadow .2s;
}
.config-card.editing { border-color: var(--brand); box-shadow: 0 0 0 2px var(--brand-light); }
.card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.card-title { display: flex; align-items: center; gap: 8px; }
.key-badge {
  font-family: monospace;
  font-size: 13px;
  font-weight: 600;
  color: var(--brand);
  background: var(--brand-light);
  padding: 2px 10px;
  border-radius: 4px;
}
.type-badge {
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--bg-hover);
  padding: 1px 8px;
  border-radius: 3px;
  text-transform: uppercase;
}
.desc { font-size: 12px; color: var(--text-tertiary); }
.value-display {
  font-size: 14px;
  color: var(--text-primary);
  padding: 8px 12px;
  background: var(--bg-hover);
  border-radius: 6px;
  margin-bottom: 10px;
  word-break: break-all;
}
.value-display.json {
  font-family: monospace;
  font-size: 12px;
  white-space: pre-wrap;
  max-height: 200px;
  overflow-y: auto;
}
.input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text-primary);
  font-size: 14px;
  margin-bottom: 10px;
  box-sizing: border-box;
}
.input:focus { border-color: var(--brand); outline: none; box-shadow: 0 0 0 2px var(--brand-light); }
.textarea { resize: vertical; font-family: monospace; font-size: 12px; }
.edit-actions { display: flex; gap: 8px; }
.btn { padding: 6px 16px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg); color: var(--text-primary); cursor: pointer; font-size: 13px; transition: border-color .15s, color .15s; }
.btn:hover { border-color: var(--brand); color: var(--brand); }
.btn-sm { padding: 4px 12px; font-size: 12px; }
.btn-primary { background: var(--brand); color: #fff; border-color: var(--brand); }
.btn-primary:hover { background: var(--brand-dark); color: #fff; }
</style>
