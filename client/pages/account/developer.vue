<template>
  <div class="account-page">
    <h1>{{ $t('account_pages.developer.title') }}</h1>
    <p class="page-desc">{{ $t('account_pages.developer.desc') }}</p>

    <div class="api-section">
      <div class="section-header">
        <h3>{{ $t('account_pages.developer.api_keys') }}</h3>
        <button class="btn-primary" :disabled="creating" @click="showCreate = true">
          {{ $t('account_pages.developer.create_key') }}
        </button>
      </div>

      <!-- 创建表单 -->
      <div v-if="showCreate" class="create-form">
        <div class="form-group">
          <label>{{ $t('account_pages.developer.key_desc_label') }}</label>
          <input v-model="form.description" class="text-input" :placeholder="$t('account_pages.developer.key_desc_placeholder')" maxlength="200" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>{{ $t('account_pages.developer.rate_limit') }}</label>
            <input v-model.number="form.rateLimit" type="number" class="text-input" min="1" max="1000" />
          </div>
          <div class="form-group">
            <label>{{ $t('account_pages.developer.daily_limit') }}</label>
            <input v-model.number="form.dailyLimit" type="number" class="text-input" min="1" max="100000" />
          </div>
        </div>
        <div class="form-actions">
          <button class="btn-primary" :disabled="creating" @click="createKey">{{ $t('account_pages.developer.confirm_create') }}</button>
          <button class="btn-secondary" @click="showCreate = false">{{ $t('account_pages.developer.cancel') }}</button>
        </div>
      </div>

      <!-- 新密钥展示 -->
      <div v-if="newKey" class="new-key-box">
        <p class="new-key-warn">{{ $t('account_pages.developer.key_once_warning') }}</p>
        <div class="key-row"><span class="key-label">API Key</span><code class="key-value">{{ newKey.apiKey }}</code></div>
        <div class="key-row"><span class="key-label">API Secret</span><code class="key-value">{{ newKey.apiSecret }}</code></div>
        <button class="btn-primary" @click="newKey = null">{{ $t('account_pages.developer.saved_close') }}</button>
      </div>

      <!-- 密钥列表 -->
      <LoadingSkeleton v-if="loading" />
      <p v-else-if="!keys.length" class="empty-hint">{{ $t('account_pages.developer.no_keys') }}</p>
      <div v-else class="key-list">
        <div v-for="k in keys" :key="k.id" class="key-card" :class="{ disabled: k.status === 0 }">
          <div class="key-info">
            <code class="key-display">{{ k.apiKey }}</code>
            <span class="key-desc">{{ k.description || $t('account_pages.developer.unnamed_key') }}</span>
            <span class="key-meta">
              {{ k.rateLimit }}/min · {{ k.dailyLimit }}/day · {{ formatDateTime(k.createTime) }}
            </span>
          </div>
          <div class="key-actions">
            <span class="status-badge" :class="k.status === 1 ? 'active' : 'inactive'">
              {{ k.status === 1 ? $t('account_pages.developer.enabled') : $t('account_pages.developer.disabled') }}
            </span>
            <button class="btn-sm" @click="toggleKey(k)">{{ k.status === 1 ? $t('account_pages.developer.disabled') : $t('account_pages.developer.enabled') }}</button>
            <button class="btn-sm danger" @click="deleteKey(k)">{{ $t('account_pages.developer.delete') }}</button>
          </div>
        </div>
      </div>

      <p v-if="msg" class="msg" :class="{ error: msgErr }">{{ msg }}</p>
    </div>

    <!-- 接入文档 -->
    <div class="api-section">
      <h3>{{ $t('account_pages.developer.api_doc_title') }}</h3>
      <div class="doc-box">
        <p>{{ $t('account_pages.developer.api_doc_desc') }}</p>
        <pre><code>const ts = Math.floor(Date.now() / 1000)
const body = JSON.stringify({ imageUrl: 'https://...' })
const sign = await hmacSha256(ts + 'POST' + '/api/open/v1/image/remove-bg' + body, apiSecret)

fetch('/api/open/v1/image/remove-bg', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,
    'X-Timestamp': String(ts),
    'X-Signature': sign,
  },
  body,
})</code></pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { api } from '@/composables/useApi'
import { formatDateTime } from '@/utils/format'

const { t } = useI18n()
const { confirm } = useConfirm()
const toast = useToast()

const keys = ref<any[]>([])
const loading = ref(true)
const showCreate = ref(false)
const creating = ref(false)
const newKey = ref<any>(null)
const msg = ref('')
const msgErr = ref(false)
const form = reactive({ description: '', rateLimit: 100, dailyLimit: 10000 })

async function loadKeys() {
  loading.value = true; msg.value = ''
  try {
    keys.value = (await api.get('/open/keys'))?.items || []
  } catch { toast.error(t('account_pages.developer.load_error')) }
  finally { loading.value = false }
}

async function createKey() {
  creating.value = true
  try {
    const result = await api.post('/open/keys', { description: form.description, rateLimit: form.rateLimit, dailyLimit: form.dailyLimit })
    newKey.value = result
    showCreate.value = false
    form.description = ''
    await loadKeys()
  } catch (e: unknown) {
    const err = e as { data?: { msg?: string }; message?: string };
    msg.value = err?.data?.msg || err.message || t('account_pages.developer.create_error')
    msgErr.value = true
  }
  creating.value = false
}

async function toggleKey(k: any) {
  try {
    await api.put(`/open/keys/${k.id}/toggle`, { status: k.status === 1 ? 0 : 1 })
    await loadKeys()
  } catch (e: unknown) {
    const err = e as { data?: { msg?: string }; message?: string };
    msg.value = err?.data?.msg || err.message || t('account_pages.developer.toggle_error')
    msgErr.value = true
  }
}

async function deleteKey(k: any) {
  if (!await confirm({ message: t('account_pages.developer.delete_confirm') })) return
  try {
    await api.delete(`/open/keys/${k.id}`)
    await loadKeys()
  } catch (e: unknown) {
    const err = e as { data?: { msg?: string }; message?: string };
    msg.value = err?.data?.msg || err.message || t('account_pages.developer.delete_error')
    msgErr.value = true
  }
}

onMounted(loadKeys)
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>

<style scoped>
.account-page { max-width: 720px; margin: 0 auto; padding: 40px 24px; }
h1 { font-size: 24px; font-weight: 700; margin-bottom: 4px; color: var(--text-primary); }
.page-desc { font-size: 13px; color: var(--text-muted); margin-bottom: 28px; }
.api-section { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 20px; }
.api-section h3 { font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.section-header h3 { margin-bottom: 0; }
.form-group { margin-bottom: 14px; }
.form-group label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 4px; }
.form-row { display: flex; gap: 16px; }
.form-row .form-group { flex: 1; }
.form-actions { display: flex; gap: 12px; margin-top: 16px; }
.text-input { width: 100%; padding: 9px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 14px; background: var(--bg-input); color: var(--text-primary); outline: none; box-sizing: border-box; }
.text-input:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.btn-primary { padding: 10px 24px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: 14px; }
.btn-primary:hover { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary { padding: 10px 24px; background: var(--bg-card); color: var(--text-secondary); border: 1px solid var(--input-border); border-radius: var(--radius-md); cursor: pointer; font-size: 14px; }
.btn-sm { padding: 6px 14px; font-size: 12px; border-radius: var(--radius-sm); border: 1px solid var(--input-border); background: var(--bg-card); color: var(--text-secondary); cursor: pointer; }
.btn-sm:hover { border-color: var(--brand); color: var(--brand); }
.btn-sm.danger { color: var(--danger); border-color: var(--danger); }
.btn-sm.danger:hover { background: var(--danger-light); }
.create-form { border: 1px dashed var(--input-border); border-radius: var(--radius-md); padding: 18px; margin-bottom: 20px; }
.new-key-box { background: #fefce8; border: 1px solid #facc15; border-radius: var(--radius-md); padding: 18px; margin-bottom: 20px; }
.new-key-warn { font-size: 13px; color: #92400e; font-weight: 600; margin-bottom: 12px; }
.key-row { margin-bottom: 10px; }
.key-label { font-size: 12px; color: var(--text-muted); display: block; margin-bottom: 2px; }
.key-value { font-size: 12px; background: #f1f5f9; padding: 4px 8px; border-radius: 4px; word-break: break-all; color: var(--text-primary); }
.key-list { display: flex; flex-direction: column; gap: 10px; }
.key-card { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border: 1px solid var(--border-light); border-radius: var(--radius-md); }
.key-card.disabled { opacity: 0.5; }
.key-info { display: flex; flex-direction: column; gap: 4px; }
.key-display { font-size: 13px; color: var(--brand); }
.key-desc { font-size: 13px; color: var(--text-secondary); }
.key-meta { font-size: 11px; color: var(--text-muted); }
.key-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.status-badge { padding: 2px 10px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.status-badge.active { background: var(--success-light); color: #166534; }
.status-badge.inactive { background: #f1f5f9; color: #94a3b8; }
.doc-box { background: #f8fafc; border-radius: var(--radius-md); padding: 16px; font-size: 12px; }
.doc-box p { color: var(--text-secondary); margin-bottom: 10px; }
.doc-box pre { background: #1e293b; color: #e2e8f0; padding: 14px; border-radius: 6px; overflow-x: auto; }
.doc-box code { font-size: 12px; line-height: 1.6; }
.msg { margin-top: 10px; font-size: 13px; color: var(--success); }
.msg.error { color: var(--danger); }
.empty-hint { font-style: italic; color: var(--text-muted); font-size: 13px; }
</style>
