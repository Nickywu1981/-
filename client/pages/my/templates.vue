<template>
  <div class="page">
    <h2>{{ $t('my.templates.page_title') }}</h2>
    <button class="btn" @click="showForm = true">{{ $t('my.templates.new_template') }}</button>

    <LoadingSkeleton v-if="loading" type="card" :rows="3" />

    <template v-else>
    <div v-if="showForm" class="form-card">
      <label for="tmpl-name">{{ $t('my.templates.name_label') }}</label>
      <input id="tmpl-name" v-model="form.name" :placeholder="$t('my.templates.name_placeholder')" />
      <label for="tmpl-width">{{ $t('my.templates.width_label') }}</label>
      <div class="size-row">
        <input id="tmpl-width" v-model.number="form.width" type="number" :placeholder="$t('my.templates.width_placeholder')" /> ×
        <label for="tmpl-height" class="sr-only">{{ $t('my.templates.height_label') }}</label>
        <input id="tmpl-height" v-model.number="form.height" type="number" :placeholder="$t('my.templates.height_placeholder')" />
      </div>
      <label for="tmpl-platform">{{ $t('my.templates.platform_label') }}</label>
      <select id="tmpl-platform" v-model="form.platform">
        <option value="">{{ $t('my.templates.platform_none') }}</option>
        <option v-for="p in platforms" :key="p.code" :value="p.code">{{ p.name }}</option>
      </select>
      <div class="form-actions">
        <button class="btn-outline" @click="showForm = false">{{ $t('my.templates.cancel') }}</button>
        <button class="btn" :disabled="saving" @click="saveTemplate">{{ $t('my.templates.save') }}</button>
      </div>
    </div>

    <div class="grid">
      <div v-for="t in templates" :key="t.id" class="card">
        <div class="card-size">{{ t.width }} × {{ t.height }}</div>
        <div class="card-name">{{ t.name }}</div>
        <div class="card-platform">{{ t.platform || $t('my.templates.platform_generic') }}</div>
        <button class="btn-del" @click="deleteTemplate(t.id)">{{ $t('my.templates.delete') }}</button>
      </div>
    </div>

    <div v-if="!templates.length && !showForm" class="empty">{{ $t('my.templates.empty') }}</div>
    </template>
  </div>
</template>

<script setup lang="ts">

const { t } = useI18n()

const showForm = ref(false);
const loading = ref(true);
const saving = ref(false);
const templates = ref<any[]>([]);
const form = reactive({ name: '', width: 800, height: 800, platform: '' });
const toast = useToast()
const { confirm } = useConfirm()

const platforms = [
  { code: 'taobao', name: t('my.templates.platform_taobao') },
  { code: 'pdd', name: t('my.templates.platform_pdd') },
  { code: 'douyin', name: t('my.templates.platform_douyin') },
  { code: 'amazon', name: t('my.templates.platform_amazon') },
  { code: 'tiktok', name: 'TikTok' },
];

async function loadTemplates() {
  loading.value = true
  try {
    const res = await $fetch('/api/templates/my', { credentials: 'include' });
    templates.value = (res as any).data?.list || [];
  } catch { toast.error(t('my.templates.load_failed')) }
  finally { loading.value = false }
}

async function saveTemplate() {
  if (!form.name.trim()) { toast.warn(t('my.templates.name_required')); return }
  saving.value = true
  try {
    await $fetch('/api/templates/my', { method: 'POST', credentials: 'include', body: { ...form } });
    toast.success(t('my.templates.create_success'))
    showForm.value = false;
    Object.assign(form, { name: '', width: 800, height: 800, platform: '' });
    loadTemplates();
  } catch { toast.error(t('my.templates.save_failed')) }
  finally { saving.value = false }
}

async function deleteTemplate(id: number) {
  if (!await confirm({ message: t('my.templates.delete_confirm'), variant: 'danger' })) return;
  try {
    await $fetch(`/api/templates/my/${id}`, { method: 'DELETE', credentials: 'include' });
    toast.success(t('my.templates.delete_success'))
    loadTemplates();
  } catch { toast.error(t('my.templates.delete_failed')) }
}

onMounted(() => loadTemplates());
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>

<style scoped>
.page { max-width: 800px; margin: 0 auto; padding: 24px 16px; }
h2 { font-size: 22px; margin-bottom: 16px; }
.btn { padding: 8px 20px; background: var(--brand-gradient); color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; transition: background var(--transition-fast), color var(--transition-fast); }
.btn-outline { padding: 8px 20px; border: 1px solid var(--border-light); border-radius: 6px; background: var(--bg-card); cursor: pointer; }
.form-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 8px; padding: 16px; margin-bottom: 24px; display: flex; flex-direction: column; gap: 10px; }
.form-card input, .form-card select { padding: 8px 12px; border: 1px solid var(--border-light); border-radius: 6px; font-size: 14px; }
.size-row { display: flex; gap: 8px; align-items: center; }
.size-row input { width: 120px; }
.form-actions { display: flex; gap: 8px; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.card { border: 1px solid var(--border-light); border-radius: 8px; padding: 16px; text-align: center; background: var(--bg-card); }
.card-size { font-size: 20px; font-weight: 700; color: var(--text-primary); }
.card-name { font-size: 14px; color: var(--text-primary); margin: 4px 0; }
.card-platform { font-size: 12px; color: var(--text-tertiary); }
.btn-del { margin-top: 8px; padding: 4px 12px; background: none; border: 1px solid var(--danger); color: var(--danger); border-radius: 4px; font-size: 12px; cursor: pointer; opacity: 0.6; }
.empty { text-align: center; padding: 60px 0; color: var(--text-tertiary); }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
</style>
