<template>
  <div class="account-page">
    <h1>开发者设置</h1>
    <p class="page-desc">管理 Open API 密钥，接入第三方开发</p>

    <div class="api-section">
      <div class="section-header">
        <h3>API Keys</h3>
        <button class="btn-primary" :disabled="creating" @click="showCreate = true">
          + 创建密钥
        </button>
      </div>

      <!-- 创建表单 -->
      <div v-if="showCreate" class="create-form">
        <div class="form-group">
          <label>密钥描述</label>
          <input v-model="form.description" class="text-input" placeholder="例如：我的小程序接入" maxlength="200" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>每分钟限制</label>
            <input v-model.number="form.rateLimit" type="number" class="text-input" min="1" max="1000" />
          </div>
          <div class="form-group">
            <label>每日限制</label>
            <input v-model.number="form.dailyLimit" type="number" class="text-input" min="1" max="100000" />
          </div>
        </div>
        <div class="form-actions">
          <button class="btn-primary" :disabled="creating" @click="createKey">确认创建</button>
          <button class="btn-secondary" @click="showCreate = false">取消</button>
        </div>
      </div>

      <!-- 新密钥展示 -->
      <div v-if="newKey" class="new-key-box">
        <p class="new-key-warn">！密钥仅显示一次，请立即保存</p>
        <div class="key-row"><span class="key-label">API Key</span><code class="key-value">{{ newKey.apiKey }}</code></div>
        <div class="key-row"><span class="key-label">API Secret</span><code class="key-value">{{ newKey.apiSecret }}</code></div>
        <button class="btn-primary" @click="newKey = null">已保存，关闭</button>
      </div>

      <!-- 密钥列表 -->
      <p v-if="!keys.length && !loading" class="empty-hint">暂无 API Key</p>
      <div v-else class="key-list">
        <div v-for="k in keys" :key="k.id" class="key-card" :class="{ disabled: k.status === 0 }">
          <div class="key-info">
            <code class="key-display">{{ k.apiKey }}</code>
            <span class="key-desc">{{ k.description || '未命名密钥' }}</span>
            <span class="key-meta">
              {{ k.rateLimit }}/min · {{ k.dailyLimit }}/day · {{ formatDateTime(k.createTime) }}
            </span>
          </div>
          <div class="key-actions">
            <span class="status-badge" :class="k.status === 1 ? 'active' : 'inactive'">
              {{ k.status === 1 ? '启用' : '禁用' }}
            </span>
            <button class="btn-sm" @click="toggleKey(k)">{{ k.status === 1 ? '禁用' : '启用' }}</button>
            <button class="btn-sm danger" @click="deleteKey(k)">删除</button>
          </div>
        </div>
      </div>

      <p v-if="msg" class="msg" :class="{ error: msgErr }">{{ msg }}</p>
    </div>

    <!-- 接入文档 -->
    <div class="api-section">
      <h3>接入文档</h3>
      <div class="doc-box">
        <p>使用 API Key 调用 Open API 端点：</p>
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

const { confirm } = useConfirm()
import { api } from '@/composables/useApi'
import { formatDateTime } from '@/utils/format'

const keys = ref<any[]>([])
const loading = ref(false)
const showCreate = ref(false)
const creating = ref(false)
const newKey = ref<any>(null)
const msg = ref('')
const msgErr = ref(false)
const form = reactive({ description: '', rateLimit: 100, dailyLimit: 10000 })

async function loadKeys() {
  loading.value = true
  try {
    keys.value = (await api.get('/open/keys'))?.items || []
  } catch { toast.error('加载API Key失败') }
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
  } catch (e: any) {
    msg.value = e?.data?.msg || e.message || '创建失败'
    msgErr.value = true
  }
  creating.value = false
}

async function toggleKey(k: any) {
  try {
    await api.put(`/open/keys/${k.id}/toggle`, { status: k.status === 1 ? 0 : 1 })
    await loadKeys()
  } catch (e: any) {
    msg.value = e?.data?.msg || e.message || '操作失败'
    msgErr.value = true
  }
}

async function deleteKey(k: any) {
  if (!await confirm({ message: '确定删除该密钥？'} )) return
  try {
    await api.delete(`/open/keys/${k.id}`)
    await loadKeys()
  } catch (e: any) {
    msg.value = e?.data?.msg || e.message || '删除失败'
    msgErr.value = true
  }
}

onMounted(loadKeys)
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
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
.btn-sm.danger:hover { background: #fee2e2; }
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
.status-badge.active { background: #dcfce7; color: #166534; }
.status-badge.inactive { background: #f1f5f9; color: #94a3b8; }
.doc-box { background: #f8fafc; border-radius: var(--radius-md); padding: 16px; font-size: 12px; }
.doc-box p { color: var(--text-secondary); margin-bottom: 10px; }
.doc-box pre { background: #1e293b; color: #e2e8f0; padding: 14px; border-radius: 6px; overflow-x: auto; }
.doc-box code { font-size: 12px; line-height: 1.6; }
.msg { margin-top: 10px; font-size: 13px; color: var(--success); }
.msg.error { color: var(--danger); }
.empty-hint { font-style: italic; color: var(--text-muted); font-size: 13px; }
</style>
