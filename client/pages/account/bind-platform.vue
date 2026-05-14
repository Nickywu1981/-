<!--
  Movio AI v4.1 — Platform Binding (平台绑定)
  G4 前端开发 | W4
  绑定/管理 淘宝/抖音/TikTok/拼多多 等电商平台店铺和账号
-->
<template>
  <div class="page-container">
    <header class="page-header">
      <h1>{{ $t('account_pages.bind_platform.title') }}</h1>
      <p>{{ $t('account_pages.bind_platform.subtitle') }}</p>
    </header>

    <LoadingSkeleton v-if="loading" />

    <template v-else>
      <!-- 已绑定列表 -->
      <div class="section">
        <h3>{{ $t('account_pages.bind_platform.bound_section') }}</h3>
        <div v-if="boundList.length === 0" class="empty-state">{{ $t('account_pages.bind_platform.no_bound') }}</div>
        <div v-else class="bound-list">
          <div v-for="b in boundList" :key="b.id" class="bound-row">
            <span class="bd-icon">{{ platformIcon(b.platform) }}</span>
            <div class="bd-info">
              <span class="bd-platform">{{ b.platform_name || b.platform }}</span>
              <span class="bd-account">{{ b.account_name || b.account_id }}</span>
            </div>
            <span class="bd-type" :class="b.bind_type">{{ b.bind_type === 'shop' ? $t('account_pages.bind_platform.shop_type') : $t('account_pages.bind_platform.account_type') }}</span>
            <button class="btn btn-ghost btn-xs" @click="doUnbind(b)">{{ $t('account_pages.bind_platform.unbind') }}</button>
          </div>
        </div>
      </div>

      <!-- 绑定新平台 -->
      <div class="section">
        <h3>{{ $t('account_pages.bind_platform.bind_new') }}</h3>
        <div class="bind-grid">
          <div v-for="p in availablePlatforms" :key="p.code" class="bind-card">
            <span class="bind-icon">{{ p.icon }}</span>
            <div class="bind-info">
              <span class="bind-name">{{ $t(p.nameKey) }}</span>
              <span class="bind-desc">{{ $t(p.descKey) }}</span>
            </div>

            <div v-if="bindTarget?.code === p.code" class="bind-form">
              <select v-model="bindType" class="input input-sm">
                <option value="shop">{{ $t('account_pages.bind_platform.bind_shop') }}</option>
                <option value="account">{{ $t('account_pages.bind_platform.bind_account') }}</option>
              </select>
              <input v-model="bindAccountId" class="input input-sm" :placeholder="$t(p.placeholderKey)" />
              <div class="bind-form-actions">
                <button class="btn btn-primary btn-xs" :disabled="!bindAccountId || binding" @click="doBind(p)">
                  {{ binding ? $t('account_pages.bind_platform.binding') : $t('account_pages.bind_platform.confirm_bind') }}
                </button>
                <button class="btn btn-ghost btn-xs" @click="bindTarget = null">{{ $t('account_pages.bind_platform.cancel') }}</button>
              </div>
            </div>

            <button v-else class="btn btn-outline btn-xs" @click="bindTarget = p">{{ $t('account_pages.bind_platform.bind') }}</button>
          </div>
        </div>
      </div>

      <!-- 说明 -->
      <div class="info-box">
        <h4>{{ $t('account_pages.bind_platform.why_title') }}</h4>
        <ul>
          <li v-for="(item, i) in $t('account_pages.bind_platform.why_items')" :key="i">{{ item }}</li>
        </ul>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
const availablePlatforms = [
  { code: 'taobao', nameKey: 'account_pages.bind_platform.__platforms.taobao', descKey: 'account_pages.bind_platform.__platforms.taobao_desc', placeholderKey: 'account_pages.bind_platform.shop_placeholder', icon: '🛒' },
  { code: 'douyin', nameKey: 'account_pages.bind_platform.__platforms.douyin', descKey: 'account_pages.bind_platform.__platforms.douyin_desc', placeholderKey: 'account_pages.bind_platform.account_placeholder', icon: '🎵' },
  { code: 'pdd', nameKey: 'account_pages.bind_platform.__platforms.pdd', descKey: 'account_pages.bind_platform.__platforms.pdd_desc', placeholderKey: 'account_pages.bind_platform.shop_placeholder', icon: '📦' },
  { code: 'kuaishou', nameKey: 'account_pages.bind_platform.__platforms.kuaishou', descKey: 'account_pages.bind_platform.__platforms.kuaishou_desc', placeholderKey: 'account_pages.bind_platform.account_placeholder', icon: '📱' },
  { code: 'xiaohongshu', nameKey: 'account_pages.bind_platform.__platforms.xiaohongshu', descKey: 'account_pages.bind_platform.__platforms.xiaohongshu_desc', placeholderKey: 'account_pages.bind_platform.account_placeholder', icon: '📕' },
  { code: 'tiktok', nameKey: 'account_pages.bind_platform.__platforms.tiktok', descKey: 'account_pages.bind_platform.__platforms.tiktok_desc', placeholderKey: 'account_pages.bind_platform.account_placeholder', icon: '🎬' },
  { code: 'shopee', nameKey: 'account_pages.bind_platform.__platforms.shopee', descKey: 'account_pages.bind_platform.__platforms.shopee_desc', placeholderKey: 'account_pages.bind_platform.shop_placeholder', icon: '🛍' },
  { code: 'amazon', nameKey: 'account_pages.bind_platform.__platforms.amazon', descKey: 'account_pages.bind_platform.__platforms.amazon_desc', placeholderKey: 'account_pages.bind_platform.shop_placeholder', icon: '📊' },
]

const platformIcons: Record<string, string> = {
  taobao: '🛒', douyin: '🎵', pdd: '📦', kuaishou: '📱',
  xiaohongshu: '📕', tiktok: '🎬', shopee: '🛍', amazon: '📊',
}
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>

<script setup lang="ts">

const { t } = useI18n()
const { confirm } = useConfirm()
const toast = useToast()
const apiBase = useRuntimeConfig().public.apiBase || '/api'

const boundList = ref<any[]>([])
const loading = ref(true)
const binding = ref(false)
const bindTarget = ref<any>(null)
const bindType = ref('shop')
const bindAccountId = ref('')

function platformIcon(p: string) { return platformIcons[p] || '🔗' }

async function fetchBindings() {
  loading.value = true
  try {
    const res: any = await $fetch(`${apiBase}/platforms/bindings`, { credentials: 'include' }).catch((err: unknown) => { const e = err as { message?: string }; if (import.meta.dev) console.warn('[bind-platform] 绑定列表加载失败', e?.message || err); return null })
    if (res?.code === 200) boundList.value = res.data?.list || []
  } catch { toast.error(t('account_pages.bind_platform.load_error')) } finally { loading.value = false }
}

async function doBind(platform: any) {
  binding.value = true
  try {
    const res: any = await $fetch(`${apiBase}/platforms/bind`, {
      method: 'POST',
      body: { platform: platform.code, bind_type: bindType.value, account_id: bindAccountId.value },
      credentials: 'include',
    }).catch((err: unknown) => { const e = err as { message?: string }; if (import.meta.dev) console.warn('[bind-platform] 绑定请求失败', e?.message || err); return null })
    if (res?.code === 200) {
      bindTarget.value = null
      bindAccountId.value = ''
      fetchBindings()
    } else {
      toast.error(res?.msg || t('account_pages.bind_platform.bind_error'))
    }
  } catch (e: unknown) {
    const err = e as { data?: { msg?: string } };
    toast.error(err?.data?.msg || t('account_pages.bind_platform.bind_error'))
  }
  binding.value = false
}

async function doUnbind(item: any) {
  const typeLabel = item.bind_type === 'shop' ? t('account_pages.bind_platform.shop_type') : t('account_pages.bind_platform.account_type')
  const confirmMsg = t('account_pages.bind_platform.unbind_confirm', { platform: item.platform_name || item.platform, type: typeLabel })
  if (!await confirm({ message: confirmMsg })) return
  try {
    await $fetch(`${apiBase}/platforms/bind/${item.id}`, { method: 'DELETE', credentials: 'include' })
    fetchBindings()
  } catch { toast.error(t('account_pages.bind_platform.unbind_error')) }
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
.bd-type.shop { background: var(--info-bg); color: #2563EB; }
.bd-type.account { background: var(--warning-border); color: #D97706; }

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
