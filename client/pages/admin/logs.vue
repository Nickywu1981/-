<template>
  <AdminLayout>
    <h2 class="ptitle">{{ $t('common.actions') }}日志</h2>

    <div class="stats-row" v-if="stats">
      <div class="stat"><span class="sv">{{ stats.total || 0 }}</span><span class="sl">{{ $t('common.log_total') }}</span></div>
      <div class="stat"><span class="sv err">{{ stats.errors || 0 }}</span><span class="sl">{{ $t('common.error') }}</span></div>
      <div class="stat"><span class="sv warn">{{ stats.warns || 0 }}</span><span class="sl">{{ $t('common.warning') }}</span></div>
    </div>

    <div class="filters">
      <input v-model="userId" type="text" :placeholder="$t('common.user_id')" @keyup.enter="fetch" />
      <input v-model="action" type="text" :placeholder="$t('common.operation_type')" @keyup.enter="fetch" />
      <select v-model="level" @change="fetch">
        <option value="">{{ $t('admin_logs.全部级别') }}</option>
        <option value="info">INFO</option>
        <option value="warn">WARN</option>
        <option value="error">ERROR</option>
      </select>
      <input v-model="dateStart" type="date" @change="fetch" :title="$t('admin_logs.开始日期')" />
      <input v-model="dateEnd" type="date" @change="fetch" :title="$t('admin_logs.结束日期')" />
      <button @click="fetch">{{ $t('common.search') }}</button>
      <button class="btn-export" @click="exportLogs">{{ $t('common.export') }}CSV</button>
    </div>

    <LoadingSkeleton v-if="loading" type="table" :rows="6" :cols="7" />

    <div v-else-if="error" class="error-state">
      <span class="error-icon">⚠️</span>
      <p>{{ error }}</p>
      <button class="retry-btn" @click="fetch">{{ $t('common.retry') }}</button>
    </div>

    <template v-else-if="list.length">
    <div class="table-wrap">
    <table class="table">
      <thead><tr><th>ID</th><th>{{ $t('common.user_id') }}</th><th>{{ $t('common.actions') }}</th><th>{{ $t('common.level') }}</th><th>{{ $t('common.details') }}</th><th>IP</th><th>{{ $t('common.time') }}</th></tr></thead>
      <tbody>
        <tr v-for="l in list" :key="l.id" @click="openDetail(l)" class="clickable">
          <td>{{ l.id }}</td>
          <td class="mono">{{ l.user_id }}</td>
          <td>{{ l.action }}</td>
          <td><span :class="levelBadge(l.level || l.type)">{{ l.level || l.type || 'INFO' }}</span></td>
          <td class="detail-cell">{{ l.detail || l.remark || '-' }}</td>
          <td class="mono">{{ l.ip || '-' }}</td>
          <td class="time">{{ l.create_time }}</td>
        </tr>
      </tbody>
    </table>
    </div>
    <Pagination :page="page" :page-size="pageSize" :total="total" @change="onPageChange" />
    </template>
    <div v-else-if="!loading" class="empty">{{ $t('common.log_empty') }}</div>

    <Teleport to="body">
      <div v-if="detail" class="modal-overlay" @click.self="detail = null" @keydown.escape="detail = null">
        <div class="modal-card">
          <h3>{{ $t('common.log_detail', { id: detail.id }) }}</h3>
          <div class="detail-grid">
            <div class="d-item"><span class="dl">{{ $t('common.user_id') }}</span><span class="dv">{{ detail.user_id }}</span></div>
            <div class="d-item"><span class="dl">{{ $t('common.actions') }}</span><span class="dv">{{ detail.action }}</span></div>
            <div class="d-item"><span class="dl">{{ $t('common.level') }}</span><span class="dv"><span :class="levelBadge(detail.level)">{{ detail.level || 'INFO' }}</span></span></div>
            <div class="d-item"><span class="dl">IP</span><span class="dv mono">{{ detail.ip || '-' }}</span></div>
            <div class="d-item"><span class="dl">{{ $t('common.time') }}</span><span class="dv">{{ detail.create_time }}</span></div>
            <div class="d-item full"><span class="dl">{{ $t('common.details') }}</span><pre class="dv-pre">{{ detail.detail || detail.remark || '-' }}</pre></div>
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
const pageSize = 50
const userId = ref('')
const action = ref('')
const level = ref('')
const dateStart = ref('')
const dateEnd = ref('')
const loading = ref(true)
const detail = ref<any>(null)
const stats = ref<any>(null)
const error = ref('')
const { downloadBlob } = useFileDownload()
const toast = useToast()

async function fetch() {
  loading.value = true; error.value = ''
  try {
    const p = new URLSearchParams({ page: String(page.value), pageSize: String(pageSize) })
    if (userId.value) p.set('userId', userId.value)
    if (action.value) p.set('action', action.value)
    if (level.value) p.set('level', level.value)
    if (dateStart.value) p.set('dateStart', dateStart.value)
    if (dateEnd.value) p.set('dateEnd', dateEnd.value)
    const res: any = await $fetch(`/api/admin/logs?${p}`, { credentials: 'include' })
    list.value = res.data?.list || []
    total.value = res.data?.total || 0
    stats.value = res.data?.stats || null
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; error.value = err?.data?.msg || err.message || t('common.loadFail'); toast.error(error.value) } finally { loading.value = false }
}

function onPageChange(p: number) { page.value = p; fetch() }
function openDetail(l: any) { detail.value = l }
function levelBadge(l: string) {
  if (!l) return ''
  const lo = l.toLowerCase()
  if (lo === 'error' || lo === 'err') return 'badge-err'
  if (lo === 'warn' || lo === 'warning') return 'badge-warn'
  return 'badge-info'
}

function escapeCSV(v: unknown): string {
  const s = String(v ?? '')
  if (/^[=+\-@]/.test(s)) return `'${s}`
  return s.replace(/"/g, '""')
}

function exportLogs() {
  const csv = ['ID,用户ID,操作,级别,详情,IP,时间']
  list.value.forEach(l => csv.push([l.id, l.user_id, l.action, l.level || 'INFO', l.detail || '', l.ip || '', l.create_time].map(c => `"${escapeCSV(c)}"`).join(',')))
  const blob = new Blob(['\uFEFF' + csv.join('\n')], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, `logs-${new Date().toISOString().slice(0,10)}.csv`)
  toast.success(t('common.csv_exported'))
}

onMounted(fetch)
definePageMeta({ layout: 'platform-admin', middleware: ['auth'] })
</script>

<style scoped>
.ptitle { font-size: 20px; font-weight: 700; margin-bottom: 20px; color: var(--text-primary); }

.stats-row { display: flex; gap: 12px; margin-bottom: 16px; }
.stat { flex: 1; max-width: 140px; background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 14px 18px; text-align: center; }
.sv { display: block; font-size: 26px; font-weight: 800; color: var(--brand); }
.sv.err { color: var(--danger); }
.sv.warn { color: var(--warning); }
.sl { font-size: 12px; color: var(--text-secondary); margin-top: 2px; display: block; }

.filters { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.filters input { padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-md); font-size: 13px; min-width: 120px; background: var(--bg-input); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.filters input:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.filters select { padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-md); font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast); }
.filters select:focus { border-color: var(--input-focus-border); }
.filters button { padding: 8px 16px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); cursor: pointer; white-space: nowrap; font-size: 13px; transition: opacity var(--transition-fast); }
.filters button:hover { opacity: 0.9; }
.btn-export { background: var(--bg-card) !important; color: var(--brand) !important; border: 1px solid var(--brand) !important; }
.btn-export:hover { background: var(--brand-alpha) !important; opacity: 1 !important; }

.table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.table { width: 100%; border-collapse: collapse; background: var(--bg-card); border-radius: var(--radius-lg); overflow: hidden; white-space: nowrap; }
.table th, .table td { padding: 10px 12px; font-size: 13px; text-align: left; border-bottom: 1px solid var(--table-border); }
.table th { background: var(--table-header-bg); font-weight: 600; color: var(--text-secondary); }
tr.clickable { cursor: pointer; }
tr.clickable:hover td { background: var(--table-row-hover); }
.detail-cell { max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mono { font-family: monospace; font-size: 12px; }
.time { font-size: 11px; color: var(--text-muted); white-space: nowrap; }

.badge-info { padding: 2px 8px; border-radius: var(--radius-xs); font-size: 11px; font-weight: 600; background: var(--brand-alpha); color: var(--brand); }
.badge-warn { padding: 2px 8px; border-radius: var(--radius-xs); font-size: 11px; font-weight: 600; background: var(--warning-bg); color: var(--warning); }
.badge-err { padding: 2px 8px; border-radius: var(--radius-xs); font-size: 11px; font-weight: 600; background: var(--danger-bg); color: var(--danger); }

.empty { text-align: center; padding: 40px; color: var(--text-muted); }

.modal-overlay { position: fixed; inset: 0; background: var(--modal-overlay); z-index: 5000; display: flex; align-items: center; justify-content: center; animation: overlay-fade-in var(--transition-base); }
.modal-card { background: var(--bg-card); border-radius: var(--modal-radius); padding: var(--modal-padding); max-width: 560px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: var(--modal-shadow); animation: modal-enter var(--transition-slow); }
.modal-card h3 { font-size: 17px; font-weight: 600; margin-bottom: 20px; color: var(--text-primary); }
.detail-grid { display: flex; flex-direction: column; gap: 10px; }
.d-item { display: flex; gap: 12px; align-items: flex-start; }
.d-item.full { flex-direction: column; gap: 4px; }
.dl { font-size: 12px; color: var(--text-muted); min-width: 70px; }
.dv { font-size: 13px; color: var(--text-primary); }
.dv-pre { background: var(--bg-secondary); padding: 12px; border-radius: var(--radius-md); font-size: 12px; line-height: 1.5; max-height: 300px; overflow: auto; color: var(--text-primary); white-space: pre-wrap; word-break: break-all; margin: 0; }
.modal-close { margin-top: 16px; width: 100%; padding: 10px; background: var(--bg-secondary); color: var(--text-primary); border: none; border-radius: var(--radius-md); cursor: pointer; font-size: 13px; transition: background var(--transition-fast); }
.modal-close:hover { background: var(--border-light); }
</style>
