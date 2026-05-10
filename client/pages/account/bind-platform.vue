<!--
  Movio AI v4.1 — Platform Binding (平台绑定)
  G4 前端开发 | W4
  绑定/管理 淘宝/抖音/TikTok/拼多多 等电商平台店铺和账号
-->
<template>
  <div class="page-container">
    <header class="page-header">
      <h1>平台绑定</h1>
      <p>绑定您的电商平台店铺和社交账号，一键分发内容</p>
    </header>

    <!-- 已绑定列表 -->
    <div class="section">
      <h3>已绑定</h3>
      <div v-if="boundList.length === 0 && !loading" class="empty-state">暂未绑定任何平台</div>
      <div v-else class="bound-list">
        <div v-for="b in boundList" :key="b.id" class="bound-row">
          <span class="bd-icon">{{ platformIcon(b.platform) }}</span>
          <div class="bd-info">
            <span class="bd-platform">{{ b.platform_name || b.platform }}</span>
            <span class="bd-account">{{ b.account_name || b.account_id }}</span>
          </div>
          <span class="bd-type" :class="b.bind_type">{{ b.bind_type === 'shop' ? '店铺' : '账号' }}</span>
          <button class="btn btn-ghost btn-xs" @click="doUnbind(b)">解绑</button>
        </div>
      </div>
    </div>

    <!-- 绑定新平台 -->
    <div class="section">
      <h3>绑定新平台</h3>
      <div class="bind-grid">
        <div v-for="p in availablePlatforms" :key="p.code" class="bind-card">
          <span class="bind-icon">{{ p.icon }}</span>
          <div class="bind-info">
            <span class="bind-name">{{ p.name }}</span>
            <span class="bind-desc">{{ p.desc }}</span>
          </div>

          <div v-if="bindTarget?.code === p.code" class="bind-form">
            <select v-model="bindType" class="input input-sm">
              <option value="shop">店铺绑定</option>
              <option value="account">账号绑定</option>
            </select>
            <input v-model="bindAccountId" class="input input-sm" :placeholder="p.code === 'taobao' ? '店铺ID/旺旺名' : '账号ID/用户名'" />
            <div class="bind-form-actions">
              <button class="btn btn-primary btn-xs" :disabled="!bindAccountId || binding" @click="doBind(p)">{{ binding ? '绑定中...' : '确认绑定' }}</button>
              <button class="btn btn-ghost btn-xs" @click="bindTarget = null">取消</button>
            </div>
          </div>

          <button v-else class="btn btn-outline btn-xs" @click="bindTarget = p">绑定</button>
        </div>
      </div>
    </div>

    <!-- 说明 -->
    <div class="info-box">
      <h4>为什么需要绑定平台？</h4>
      <ul>
        <li>绑定后可一键将AI素材发布到对应平台</li>
        <li>系统会自动适配各平台的图片尺寸和视频格式</li>
        <li>您的账号凭证使用AES-256加密存储，安全有保障</li>
        <li>可随时解绑，数据不会丢失</li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
const availablePlatforms = [
  { code: 'taobao', name: '淘宝', icon: '🛒', desc: '绑定淘宝/天猫店铺' },
  { code: 'douyin', name: '抖音', icon: '🎵', desc: '绑定抖音账号/小店' },
  { code: 'pdd', name: '拼多多', icon: '📦', desc: '绑定拼多多店铺' },
  { code: 'kuaishou', name: '快手', icon: '📱', desc: '绑定快手账号/小店' },
  { code: 'xiaohongshu', name: '小红书', icon: '📕', desc: '绑定小红书账号' },
  { code: 'tiktok', name: 'TikTok Shop', icon: '🎬', desc: '绑定TikTok Shop' },
  { code: 'shopee', name: 'Shopee', icon: '🛍', desc: '绑定Shopee店铺' },
  { code: 'amazon', name: 'Amazon', icon: '📊', desc: '绑定Amazon店铺' },
]

const platformIcons: Record<string, string> = {
  taobao: '🛒', douyin: '🎵', pdd: '📦', kuaishou: '📱',
  xiaohongshu: '📕', tiktok: '🎬', shopee: '🛍', amazon: '📊',
}
</script>

<script setup lang="ts">

const { confirm } = useConfirm()
import { ref, onMounted } from 'vue'

const toast = useToast()

const apiBase = useRuntimeConfig().public.apiBase || '/api'

const boundList = ref<any[]>([])
const loading = ref(false)
const binding = ref(false)
const bindTarget = ref<any>(null)
const bindType = ref('shop')
const bindAccountId = ref('')

function platformIcon(p: string) { return platformIcons[p] || '🔗' }

async function fetchBindings() {
  loading.value = true
  try {
    const res: any = await $fetch(`${apiBase}/platforms/bindings`, { credentials: 'include' }).catch(() => null)
    if (res?.code === 200) boundList.value = res.data?.list || []
  } catch { toast.error('加载平台绑定失败') } finally { loading.value = false }

}

async function doBind(platform: any) {
  binding.value = true
  try {
    const res: any = await $fetch(`${apiBase}/platforms/bind`, {
      method: 'POST',
      body: {
        platform: platform.code,
        bind_type: bindType.value,
        account_id: bindAccountId.value,
      },
      credentials: 'include',
    }).catch(() => null)
    if (res?.code === 200) {
      bindTarget.value = null
      bindAccountId.value = ''
      fetchBindings()
    } else {
      toast.error(res?.msg || '绑定失败')
    }
  } catch (e: any) {
    toast.error(e.data?.msg || '绑定失败')
  }
  binding.value = false
}

async function doUnbind(item: any) {
  if (!await confirm({ message: `确定解绑 ${item.platform_name || item.platform} 的${item.bind_type === 'shop' ? '店铺' : '账号'}？`)) return
  try {
    await $fetch(`${apiBase}/platforms/bind/${item.id}`, { method: 'DELETE', credentials: 'include' })
    fetchBindings()
  } catch { toast.error('解绑失败') }
}

onMounted(() => fetchBindings())
</script>

<style scoped>
.page-container { max-width: 800px; margin: 0 auto; padding: var(--cfg-spacing-xl) var(--cfg-spacing-base); }
.page-header { text-align: center; margin-bottom: 24px; }
.page-header h1 { font-size: var(--cfg-font-size-2xl); margin: 0 0 6px; }
.page-header p { color: var(--cfg-text-muted); margin: 0; }

.section { margin-bottom: 28px; }
.section h3 { font-size: var(--cfg-font-size-lg); margin: 0 0 16px; color: var(--cfg-text-primary); }

.empty-state { text-align: center; padding: 32px; color: var(--cfg-text-muted); border: 1px dashed var(--cfg-border); border-radius: var(--cfg-radius-base); }

.bound-list { border: 1px solid var(--cfg-border); border-radius: var(--cfg-radius-base); overflow: hidden; }
.bound-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--cfg-border); background: var(--cfg-bg-primary); }
.bound-row:last-child { border-bottom: none; }
.bd-icon { font-size: 24px; flex-shrink: 0; }
.bd-info { flex: 1; display: flex; flex-direction: column; }
.bd-platform { font-size: var(--cfg-font-size-base); font-weight: var(--cfg-font-weight-medium); color: var(--cfg-text-primary); }
.bd-account { font-size: var(--cfg-font-size-xs); color: var(--cfg-text-muted); }
.bd-type { font-size: var(--cfg-font-size-xs); padding: 2px 8px; border-radius: var(--cfg-radius-full); }
.bd-type.shop { background: #dbeafe; color: #2563EB; }
.bd-type.account { background: #fef3c7; color: #D97706; }

.bind-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px; }
.bind-card { padding: 16px; border: 1px solid var(--cfg-border); border-radius: var(--cfg-radius-base); background: var(--cfg-bg-primary); display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.bind-icon { font-size: 28px; flex-shrink: 0; }
.bind-info { flex: 1; min-width: 120px; }
.bind-name { font-size: var(--cfg-font-size-base); font-weight: var(--cfg-font-weight-semibold); color: var(--cfg-text-primary); display: block; }
.bind-desc { font-size: var(--cfg-font-size-xs); color: var(--cfg-text-muted); }

.bind-form { width: 100%; margin-top: 10px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.input-sm { padding: 6px 10px; font-size: var(--cfg-font-size-sm); flex: 1; min-width: 100px; }
.bind-form-actions { display: flex; gap: 6px; }

.info-box { background: var(--cfg-bg-tertiary); border-radius: var(--cfg-radius-base); padding: 16px 20px; }
.info-box h4 { font-size: var(--cfg-font-size-base); margin: 0 0 10px; color: var(--cfg-text-primary); }
.info-box ul { margin: 0; padding-left: 20px; font-size: var(--cfg-font-size-sm); color: var(--cfg-text-secondary); line-height: 1.8; }
</style>
