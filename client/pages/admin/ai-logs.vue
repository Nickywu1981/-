<template>
  <AdminLayout>
    <h2 class="ptitle">{{ $t('admin_ai_logs.ai_调用日志') }}</h2>

    <div class="stats-row">
      <div class="stat"><span class="sv">{{ stats.totalCalls || 0 }}</span><span class="sl">{{ $t('admin_ai_logs.总调用') }}</span></div>
      <div class="stat"><span class="sv ok">{{ stats.successCalls || 0 }}</span><span class="sl">{{ $t('common.success') }}</span></div>
      <div class="stat"><span class="sv err">{{ stats.failCalls || 0 }}</span><span class="sl">{{ $t('common.failed') }}</span></div>
      <div class="stat"><span class="sv">{{ stats.totalTokens ? (stats.totalTokens / 1000).toFixed(1) + 'K' : '-' }}</span><span class="sl">{{ $t('admin_ai_logs.总token') }}</span></div>
      <div class="stat"><span class="sv">{{ stats.avgDuration || '-' }}ms</span><span class="sl">{{ $t('admin_ai_logs.平均耗时') }}</span></div>
    </div>

    <div class="toolbar">
      <select v-model="filterStatus" class="sel" @change="fetchData">
        <option value="">{{ $t('admin_ai_logs.全部状态') }}</option>
        <option value="1">{{ $t('common.success') }}</option>
        <option value="0">{{ $t('common.failed') }}</option>
      </select>
      <select v-model="filterModel" class="sel" @change="fetchData">
        <option value="">{{ $t('admin_ai_logs.全部模型') }}</option>
        <option value="gpt-4o">GPT-4o</option>
        <option value="dall-e-3">DALL-E 3</option>
        <option value="sora">Sora</option>
        <option value="midjourney">Midjourney</option>
      </select>
      <input v-model="dateStart" type="date" @change="fetchData" :title="$t('admin_ai_logs.开始日期')" />
      <input v-model="dateEnd" type="date" @change="fetchData" :title="$t('admin_ai_logs.结束日期')" />
      <button class="btn btn-refresh" @click="fetchData">{{ $t('common.refresh') }}</button>
    </div>

    <LoadingSkeleton v-if="loading" type="table" :rows="5" :cols="8" />

    <div v-else-if="error" class="error-msg">{{ error }} <button @click="fetchData">{{ $t('admin_ai_logs.重试') }}</button></div>

    <div class="table-wrap" v-else-if="list.length">
    <table class="table">
      <thead>
        <tr><th>ID</th><th>{{ $t('admin_ai_logs.用户') }}</th><th>{{ $t('admin_ai_logs.模型') }}</th><th>{{ $t('admin_ai_logs.输入') }}</th><th>{{ $t('admin_ai_logs.输出') }}</th><th>{{ $t('admin_ai_logs.耗时') }}</th><th>{{ $t('common.status') }}</th><th>{{ $t('common.actions') }}</th><th>{{ $t('common.time') }}</th></tr>
      </thead>
      <tbody>
        <tr v-for="log in list" :key="log.id">
          <td>{{ log.id }}</td><td>{{ log.user_id }}</td><td class="model">{{ log.model_name }}</td>
          <td>{{ log.prompt_tokens || '-' }}</td><td>{{ log.response_tokens || '-' }}</td>
          <td>{{ log.duration_ms ? log.duration_ms + 'ms' : '-' }}</td>
          <td><span :class="log.status===1?'s-ok':'s-fail'">{{ log.status===1 ? $t('common.status_success') : $t('common.status_failed') }}</span></td>
          <td><button class="btn-sm" @click="openDetail(log)">{{ $t('common.details') }}</button></td>
          <td class="time">{{ log.create_time?.slice(0,16) }}</td>
        </tr>
      </tbody>
    </table>
    </div>

    <Pagination v-if="total>pageSize" :page="page" :page-size="pageSize" :total="total" @change="onPageChange" />
    <div v-if="!list.length && !loading" class="empty">{{ $t('common.noData') }}</div>

    <Teleport to="body">
      <div v-if="detail" class="modal-overlay" @click.self="detail = null" @keydown.escape="detail = null">
        <div class="modal-card">
          <h3>{{ $t('common.ai_call_detail') }} #{{ detail.id }}</h3>
          <div class="dg">
            <div class="di"><span class="dl">{{ $t('admin_ai_logs.模型') }}</span><span class="dv">{{ detail.model_name }}</span></div>
            <div class="di"><span class="dl">{{ $t('admin_ai_logs.用户id') }}</span><span class="dv">{{ detail.user_id }}</span></div>
            <div class="di"><span class="dl">{{ $t('common.status') }}</span><span class="dv"><span :class="detail.status===1?'s-ok':'s-fail'">{{ detail.status===1 ? $t('common.success') : $t('common.failed') }}</span></span></div>
            <div class="di"><span class="dl">{{ $t('admin_ai_logs.输入token') }}</span><span class="dv">{{ detail.prompt_tokens }}</span></div>
            <div class="di"><span class="dl">{{ $t('admin_ai_logs.输出token') }}</span><span class="dv">{{ detail.response_tokens }}</span></div>
            <div class="di"><span class="dl">{{ $t('admin_ai_logs.耗时') }}</span><span class="dv">{{ detail.duration_ms }}ms</span></div>
            <div class="di"><span class="dl">{{ $t('common.result') }}{{ $t('common.type') }}</span><span class="dv">{{ detail.result_type || '-' }}</span></div>
            <div class="di"><span class="dl">{{ $t('common.time') }}</span><span class="dv">{{ detail.create_time }}</span></div>
            <div class="di full"><span class="dl">{{ $t('admin_ai_logs.输入内容') }}</span><pre class="pre">{{ detail.prompt_text || '-' }}</pre></div>
            <div class="di full" v-if="detail.response_text"><span class="dl">{{ $t('admin_ai_logs.输出内容') }}</span><pre class="pre">{{ detail.response_text }}</pre></div>
            <div class="di full" v-if="detail.error_msg"><span class="dl">{{ $t('admin_ai_logs.错误信息') }}</span><pre class="pre err">{{ detail.error_msg }}</pre></div>
          </div>
          <button class="modal-close" @click="detail = null">{{ $t('common.close') }}</button>
        </div>
      </div>
    </Teleport>
  </AdminLayout>
</template>

<script setup lang="ts">const { t } = useI18n()


const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const filterStatus = ref('')
const filterModel = ref('')
const dateStart = ref('')
const dateEnd = ref('')
const loading = ref(true)
const error = ref('')
const detail = ref<any>(null)
const stats = reactive({ totalCalls: 0, successCalls: 0, failCalls: 0, totalTokens: 0, avgDuration: '' })
const toast = useToast()

onMounted(() => fetchData())

async function fetchData() {
  loading.value = true; error.value = ''
  try {
    const p = new URLSearchParams({ page: String(page.value), pageSize: String(pageSize) })
    if (filterStatus.value) p.set('status', filterStatus.value)
    if (filterModel.value) p.set('modelId', filterModel.value)
    if (dateStart.value) p.set('dateStart', dateStart.value)
    if (dateEnd.value) p.set('dateEnd', dateEnd.value)
    const res: any = await $fetch(`/api/admin/ai-logs?${p}`)
    list.value = res.data?.list || []
    total.value = res.data?.total || 0
    if (res.data?.stats) Object.assign(stats, res.data.stats)
  } catch (e: unknown) { error.value = t('common.loadFail'); toast.error(t('common.loadFail')) } finally { loading.value = false }
}

function onPageChange(p: number) { page.value = p; fetchData() }
function openDetail(log: any) { detail.value = log }
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>

<style scoped>
.ptitle { font-size: 20px; font-weight: 700; margin-bottom: 20px; color: var(--text-primary); }

.stats-row { display: flex; gap: 12px; margin-bottom: 16px; }
.stat { flex: 1; max-width: 130px; background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 12px 16px; text-align: center; }
.sv { display: block; font-size: 24px; font-weight: 800; color: var(--brand); }
.sv.ok { color: var(--success); }
.sv.err { color: var(--danger); }
.sl { font-size: 12px; color: var(--text-secondary); margin-top: 2px; display: block; }

.toolbar { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
.sel { padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-md); background: var(--bg-input); color: var(--text-primary); font-size: 13px; outline: none; transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.sel:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.toolbar input[type=date] { padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-md); font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.toolbar input[type=date]:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.btn { padding: 8px 16px; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: 13px; transition: opacity var(--transition-fast); }
.btn-refresh { background: var(--brand); color: #fff; }
.btn-refresh:hover { opacity: 0.9; }

.table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.table { width: 100%; border-collapse: collapse; background: var(--bg-card); border-radius: var(--radius-lg); overflow: hidden; }
.table th, .table td { padding: 10px 12px; border-bottom: 1px solid var(--table-border); font-size: 13px; text-align: left; }
.table th { background: var(--table-header-bg); font-weight: 600; color: var(--text-secondary); }
tr:hover td { background: var(--table-row-hover); }
.model { color: var(--brand); font-weight: 500; }
.s-ok { color: var(--success); font-weight: 600; }
.s-fail { color: var(--danger); font-weight: 600; }
.time { font-size: 11px; color: var(--text-muted); white-space: nowrap; }
.btn-sm { padding: 4px 12px; font-size: 12px; border: 1px solid var(--border-light); border-radius: var(--radius-xs); background: var(--bg-card); color: var(--brand); cursor: pointer; transition: border-color var(--transition-fast), color var(--transition-fast); }
.btn-sm:hover { border-color: var(--brand); background: var(--brand-alpha); }

.empty { text-align: center; padding: 40px; color: var(--text-muted); }
.error-msg { text-align: center; padding: 40px; color: var(--danger); }

.modal-overlay { position: fixed; inset: 0; background: var(--modal-overlay); z-index: 5000; display: flex; align-items: center; justify-content: center; animation: overlay-fade-in var(--transition-base); }
.modal-card { background: var(--bg-card); border-radius: var(--modal-radius); padding: var(--modal-padding); max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: var(--modal-shadow); animation: modal-enter var(--transition-slow); }
.modal-card h3 { font-size: 17px; font-weight: 600; margin-bottom: 20px; color: var(--text-primary); }
.dg { display: flex; flex-direction: column; gap: 10px; }
.di { display: flex; gap: 12px; }
.di.full { flex-direction: column; gap: 4px; }
.dl { font-size: 12px; color: var(--text-muted); min-width: 80px; }
.dv { font-size: 13px; color: var(--text-primary); }
.pre { background: var(--bg-secondary); padding: 10px; border-radius: var(--radius-md); font-size: 12px; line-height: 1.5; max-height: 250px; overflow: auto; white-space: pre-wrap; word-break: break-all; color: var(--text-primary); margin: 0; }
.pre.err { color: var(--danger); background: var(--danger-bg); }
.modal-close { margin-top: 16px; width: 100%; padding: 10px; background: var(--bg-secondary); color: var(--text-primary); border: none; border-radius: var(--radius-md); cursor: pointer; font-size: 13px; transition: background var(--transition-fast); }
.modal-close:hover { background: var(--border-light); }
</style>
