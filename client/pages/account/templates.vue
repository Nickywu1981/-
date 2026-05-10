<template>
  <div class="account-templates">
    <div class="templates-header">
      <h2>我的模板</h2>
      <span class="templates-count">共 {{ templates.length }} 个模板</span>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="skeleton-card" v-for="n in 6" :key="n" />
    </div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button class="btn-primary" @click="fetchTemplates">重试</button>
    </div>

    <div v-else-if="templates.length === 0" class="empty-state">
      <div class="empty-icon">📁</div>
      <p>暂无模板</p>
      <span>前往工作台创建你的第一个模板</span>
      <NuxtLink to="/workspace" class="btn-primary">去工作台</NuxtLink>
    </div>

    <div v-else class="templates-grid">
      <div v-for="tpl in templates" :key="tpl.id" class="template-card">
        <div class="card-preview">
          <img v-if="tpl.thumbnail" :src="tpl.thumbnail" :alt="tpl.name" loading="lazy" @error="e => (e.target as HTMLImageElement).style.display='none'" />
          <div v-else class="preview-placeholder">{{ tpl.name?.[0] }}</div>
        </div>
        <div class="card-body">
          <h4>{{ tpl.name }}</h4>
          <span class="card-type">{{ tpl.type_name || tpl.task_type }}</span>
        </div>
        <div class="card-footer">
          <span class="card-date">{{ new Date(tpl.create_time).toLocaleDateString() }}</span>
          <button class="btn-use" @click="$router.push('/workspace')">使用</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">


const loading = ref(true)
const error = ref('')
const templates = ref<any[]>([])

async function fetchTemplates() {
  loading.value = true
  error.value = ''
  try {
    const data: any = await $fetch('/api/prompts/templates', { params: { scope: 'my' }, credentials: 'include' })
    templates.value = data?.list || []
  } catch (e: any) {
    error.value = e?.data?.msg || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(fetchTemplates)
</script>

<style scoped>
.account-templates { max-width: 900px; margin: 0 auto; padding: 24px; }
.templates-header { display: flex; align-items: baseline; gap: 16px; margin-bottom: 24px; }
.templates-header h2 { font-size: 20px; font-weight: 600; color: var(--text-primary); }
.templates-count { font-size: 13px; color: var(--text-tertiary); }

.loading-state { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.skeleton-card { height: 180px; border-radius: 12px; background: var(--bg-tertiary); animation: pulse 1.5s infinite; }

.error-state, .empty-state { text-align: center; padding: 60px 20px; }
.error-state p { color: var(--danger); margin-bottom: 16px; }
.empty-state .empty-icon { font-size: 48px; margin-bottom: 16px; }
.empty-state p { font-size: 16px; color: var(--text-secondary); margin-bottom: 8px; }
.empty-state span { font-size: 13px; color: var(--text-tertiary); display: block; margin-bottom: 20px; }

.templates-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.template-card { background: var(--bg-secondary); border-radius: 12px; border: 1px solid var(--border); overflow: hidden; transition: transform .2s, box-shadow .2s; }
.template-card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px var(--shadow); }
.card-preview { height: 120px; background: var(--bg-tertiary); display: flex; align-items: center; justify-content: center; }
.card-preview img { width: 100%; height: 100%; object-fit: cover; }
.preview-placeholder { font-size: 32px; font-weight: 700; color: var(--brand); }
.card-body { padding: 12px 16px 8px; }
.card-body h4 { font-size: 14px; color: var(--text-primary); margin-bottom: 4px; }
.card-type { font-size: 12px; color: var(--brand); background: var(--brand-bg); padding: 2px 8px; border-radius: 4px; }
.card-footer { padding: 8px 16px 12px; display: flex; justify-content: space-between; align-items: center; }
.card-date { font-size: 12px; color: var(--text-tertiary); }
.btn-use { padding: 4px 14px; font-size: 12px; color: var(--brand); background: var(--brand-bg); border: 1px solid var(--brand-border); border-radius: 6px; cursor: pointer; transition: background .15s, color .15s; }
.btn-use:hover { background: var(--brand); color: #fff; }
.btn-primary { display: inline-block; padding: 10px 24px; background: var(--brand); color: #fff; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; text-decoration: none; transition: opacity .15s; }
.btn-primary:hover { opacity: .9; }

@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }

@media (max-width: 768px) {
  .templates-grid, .loading-state { grid-template-columns: 1fr; }
}
</style>
