<template>
  <AdminLayout>
    <h2 class="ptitle">{{ $t('admin_compliance.跨境合规检查') }}</h2>
    <div class="toolbar">
      <input v-model="checkContent" class="input-search" :placeholder="$t('admin_compliance.输入要检查的商品文案_描述')" @keyup.enter="doCheck" />
      <select v-model="checkPlatform" class="sel">
        <option value="">{{ $t('admin_compliance.选择平台') }}</option>
        <option v-for="t in targets" :key="t.code" :value="t.code">{{ t.name }}</option>
      </select>
      <button class="btn btn-primary" :disabled="!checkContent||!checkPlatform" @click="doCheck">{{ $t('admin_compliance.检查合规') }}</button>
    </div>

    <div class="rules-section" v-if="targets.length">
      <h3>{{ $t('admin_compliance.平台合规概览') }}</h3>
      <div class="rules-grid">
        <div v-for="t in targets" :key="t.code" class="rule-card" @click="viewRules(t)">
          <span class="rule-name">{{ t.name }}</span>
          <span class="rule-counts">🖼 {{ t.imageRuleCount }} {{ $t('common.rules_text') }} · 📝 {{ t.textRuleCount }} {{ $t('common.rules_text') }}</span>
          <button class="btn-sm">{{ $t('common.view') }}{{ $t('common.rules_text') }}</button>
        </div>
      </div>
    </div>

    <div v-if="checkResult" class="check-result" :class="checkResult.passed ? 'passed' : 'failed'">
      <h3>{{ $t('common.check_result_label') }}{{ checkResult.passed ? '✅ ' + $t('common.passed') : '❌ ' + $t('common.has_issues') }}</h3>
      <ul v-if="checkResult.issues?.length">
        <li v-for="(issue, i) in checkResult.issues" :key="i">
          <span :class="'sev-'+issue.severity">{{ issue.severity }}</span>
          {{ issue.desc || issue.message }}
        </li>
      </ul>
      <p v-else>{{ $t('admin_compliance.未发现问题') }}</p>
    </div>

    <div v-if="rulesDetail" class="rules-detail">
      <h3>{{ rulesDetail.name }} 合规规则 <button class="btn-close" aria-label="关闭规则详情" @click="rulesDetail=null">✕</button></h3>
      <div v-if="rulesDetail.imageRules?.length"><h4>{{ $t('admin_compliance.图片规则') }}</h4><ul><li v-for="r in rulesDetail.imageRules" :key="r.id">{{ r.desc }}</li></ul></div>
      <div v-if="rulesDetail.textRules?.length"><h4>{{ $t('admin_compliance.文案规则') }}</h4><ul><li v-for="r in rulesDetail.textRules" :key="r.id">{{ r.desc }}</li></ul></div>
    </div>
  </AdminLayout>
</template>
<script setup lang="ts">const { t } = useI18n()


const targets = ref<any[]>([])
const loading = ref(true)
const checkContent = ref('')
const checkPlatform = ref('')
const checkResult = ref<any>(null)
const rulesDetail = ref<any>(null)
const toast = useToast()

async function fetchTargets() {
  try {
    const data: any = await $fetch('/api/compliance/targets', { credentials: 'include' })
    targets.value = data?.data || []
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || t('common.loadFail')) }
  finally { loading.value = false }
}

async function doCheck() {
  try {
    const data: any = await $fetch('/api/compliance/check', {
      method: 'POST',
      body: { content: checkContent.value, platform: checkPlatform.value },
      credentials: 'include',
    })
    checkResult.value = data?.data || { passed: false, issues: [{ desc: data?.msg || '检查失败' }] }
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; checkResult.value = { passed: false, issues: [{ desc: err?.data?.msg || '检查失败' }] } }
}

async function viewRules(target: any) {
  try {
    const data: any = await $fetch(`/api/compliance/rules/${target.code}`, { credentials: 'include' })
    rulesDetail.value = data?.data || target
  } catch (e: unknown) { toast.error(e?.message || t('common.loadFail')) }
}

onMounted(fetchTargets)
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>
<style scoped>
h2 { font-size: 22px; font-weight: 700; color: var(--text-primary); margin-bottom: 20px; }
h3 { font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px; }
h4 { font-size: 14px; font-weight: 600; color: var(--text-secondary); margin: 8px 0 6px; }

.toolbar { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
.input-search { flex: 1; min-width: 200px; padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.input-search:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.sel { padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--bg-card); color: var(--text-primary); outline: none; }
.sel:focus { border-color: var(--input-focus-border); }
.btn { padding: 8px 16px; border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; white-space: nowrap; transition: opacity var(--transition-fast); }
.btn-primary { background: var(--brand); color: #fff; }
.btn-primary:hover { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-sm { padding: 4px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-xs); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 12px; transition: border-color var(--transition-fast), color var(--transition-fast); }
.btn-sm:hover { border-color: var(--brand); color: var(--brand); }

.rules-section { margin-top: 24px; }
.rules-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
.rule-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 16px; cursor: pointer; transition: border-color var(--transition-base), box-shadow var(--transition-base), transform var(--transition-base); display: flex; flex-direction: column; gap: 8px; }
.rule-card:hover { border-color: var(--brand); box-shadow: var(--shadow-card); transform: translateY(-1px); }
.rule-name { font-weight: 600; font-size: 15px; color: var(--text-primary); }
.rule-counts { font-size: 12px; color: var(--text-muted); }

.check-result { margin-top: 20px; padding: 20px; border-radius: var(--radius-lg); border: 1px solid var(--border-light); }
.check-result.passed { background: var(--success-light); border-color: var(--success); }
.check-result.failed { background: var(--danger-light); border-color: var(--danger); }
.check-result h3 { margin-bottom: 10px; }
.check-result ul { list-style: none; padding: 0; margin: 0; }
.check-result li { padding: 6px 0; font-size: 13px; color: var(--text-primary); display: flex; align-items: center; gap: 8px; }
.check-result p { font-size: 13px; color: var(--text-muted); }

.sev-high, .sev-error { background: var(--danger); color: #fff; padding: 1px 6px; border-radius: var(--radius-xs); font-size: 11px; font-weight: 600; text-transform: uppercase; }
.sev-medium, .sev-warn { background: var(--warning); color: #fff; padding: 1px 6px; border-radius: var(--radius-xs); font-size: 11px; font-weight: 600; text-transform: uppercase; }
.sev-low, .sev-info { background: var(--info); color: #fff; padding: 1px 6px; border-radius: var(--radius-xs); font-size: 11px; font-weight: 600; text-transform: uppercase; }

.rules-detail { margin-top: 20px; background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 20px; }
.rules-detail h3 { display: flex; justify-content: space-between; align-items: center; }
.rules-detail ul { list-style: disc; padding-left: 20px; margin: 0; }
.rules-detail li { padding: 4px 0; font-size: 13px; color: var(--text-secondary); }
.btn-close { background: none; border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 4px 10px; cursor: pointer; font-size: 14px; color: var(--text-muted); transition: color var(--transition-fast), border-color var(--transition-fast); }
.btn-close:hover { color: var(--danger); border-color: var(--danger); }

@media (max-width: 640px) {
  .toolbar { flex-direction: column; }
  .input-search { max-width: 100%; }
  .rules-grid { grid-template-columns: 1fr; }
}
</style>
