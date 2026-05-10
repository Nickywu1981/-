<template>
  <WorkLayout title="文字特效" :steps="['输入文字', '选特效', '生成']" :current-step="step">
    <div v-if="step === 0" class="step-content">
      <h3 class="step-title">输入文字内容</h3>
      <p class="step-desc">输入要生成特效的文字，选择特效风格后 AI 自动渲染</p>
      <textarea v-model="text" placeholder="请输入要添加特效的文字，例如：限时特卖..." rows="5" class="text-input" maxlength="100" />
      <p class="char-count">{{ text.length }}/100</p>
      <div v-if="text.trim()" class="actions">
        <PromptEnhancer mode="image" :initial-prompt="text" @applied="(v) => text = v" />
        <button class="btn-primary" @click="step = 1">下一步：选择特效 →</button></div>
    </div>

    <div v-else-if="step === 1" class="step-content">
      <h3 class="step-title">选择文字特效</h3>
      <p class="step-desc">6 种特效风格可选，每种风格适配不同的营销场景</p>
      <div class="effect-grid">
        <button v-for="e in effects" :key="e.id" class="effect-card" :class="{ active: selectedEffect === e.id }" @click="selectedEffect = e.id">
          <span class="effect-icon">{{ e.icon }}</span>
          <span class="effect-name">{{ e.name }}</span>
          <span class="effect-desc">{{ e.desc }}</span>
        </button>
      </div>
      <div class="cost-badge"><span class="cost-icon">⚡</span> 成本：2 积分/次</div>
      <div class="actions">
        <button class="btn-outline" @click="step = 0">← 返回</button>
        <button class="btn-primary" @click="submitTask" :disabled="!selectedEffect">生成特效</button>
      </div>
    </div>

    <div v-else class="step-content result-step">
      <div v-if="processing" class="processing-card">
        <span class="spinner" />
        <h4>AI 正在渲染文字特效</h4>
        <p class="hint">预计耗时 3-8 秒，请耐心等待</p>
      </div>
      <div v-if="resultUrl && !processing" class="result-display">
        <img loading="lazy" :src="resultUrl" alt="result" class="result-image" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
        <div class="result-actions">
          <button class="btn-primary" @click="downloadImage">下载图片</button>
          <button class="btn-outline" @click="resetAll">重新生成</button>
        </div>
      </div>
    </div>
  </WorkLayout>
</template>

<script setup lang="ts">

import PromptEnhancer from '~/components/PromptEnhancer.vue'

const step = ref(0); const text = ref(''); const selectedEffect = ref('neon')
const processing = ref(false); const resultUrl = ref('')
const effects = [
  { id: 'neon', name: '霓虹灯', icon: '💡', desc: '赛博朋克风格夜间营销' },
  { id: 'gold', name: '金属质感', icon: '✨', desc: '高端奢华品牌专属' },
  { id: 'fire', name: '火焰特效', icon: '🔥', desc: '促销活动爆款文案' },
  { id: 'ice', name: '冰晶效果', icon: '❄️', desc: '数码家电清凉感' },
  { id: '3d', name: '立体浮雕', icon: '🧊', desc: '3D 立体视觉冲击' },
  { id: 'shadow', name: '投影阴影', icon: '🌑', desc: '简约高级品牌质感' },
]
const toast = useToast()
async function submitTask() {
  processing.value = true; step.value = 2
  try {
    const res: any = await $fetch('/api/advanced/text-effect', { method: 'POST', body: { text: text.value, effect: selectedEffect.value } })
    resultUrl.value = res.data?.result_url || res.result_url
  } catch (err: any) {
    toast.error(err?.data?.msg || err?.message || '生成失败，请重试')
    step.value = 1
  } finally { processing.value = false }
}
const { download } = useFileDownload()
function downloadImage() { if (resultUrl.value) download(resultUrl.value, 'text-effect.png') }
function resetAll() { step.value = 0; text.value = ''; resultUrl.value = ''; processing.value = false }
</script>

<style scoped>
.step-content { max-width: 680px; margin: 0 auto; }
.step-title { font-size: 18px; font-weight: 700; margin-bottom: 8px; color: var(--text-primary); }
.step-desc { font-size: 13px; color: var(--text-muted); margin-bottom: 20px; }
.text-input {
  width: 100%; padding: 14px 16px; border: 1px solid var(--input-border); border-radius: var(--radius-lg);
  font-size: 15px; resize: vertical; background: var(--bg-card); color: var(--text-primary);
  outline: none; transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  font-family: inherit; min-height: 100px;
}
.text-input:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.char-count { text-align: right; font-size: 12px; color: var(--text-muted); margin-top: 4px; }
.effect-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.effect-card {
  display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 16px 8px;
  border: 2px solid var(--input-border); border-radius: var(--radius-lg); background: var(--bg-card);
  cursor: pointer; transition: border-color var(--transition-fast), transform var(--transition-fast), box-shadow var(--transition-fast); text-align: center;
}
.effect-card:hover { border-color: var(--brand-light); transform: translateY(-2px); box-shadow: var(--shadow-md); }
.effect-card.active { border-color: var(--brand); background: var(--brand-subtle); box-shadow: var(--shadow-brand); }
.effect-icon { font-size: 28px; }
.effect-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.effect-desc { font-size: 11px; color: var(--text-muted); line-height: 1.3; }
.cost-badge { display: inline-flex; align-items: center; gap: 4px; margin-top: 16px; padding: 6px 14px; background: var(--bg-subtle); border-radius: 20px; font-size: 12px; color: var(--text-secondary); }
.cost-icon { font-size: 14px; }
.actions { display: flex; gap: 10px; margin-top: 20px; justify-content: center; }
.btn-primary {
  padding: 10px 28px; background: var(--brand-gradient); color: #fff; border: none;
  border-radius: var(--radius-lg); cursor: pointer; font-size: 14px; font-weight: 600;
  transition: opacity var(--transition-fast), transform var(--transition-fast); box-shadow: var(--shadow-brand);
}
.btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.btn-outline {
  padding: 10px 28px; background: transparent; color: var(--text-primary);
  border: 1px solid var(--input-border); border-radius: var(--radius-lg); cursor: pointer;
  font-size: 14px; transition: border-color var(--transition-fast), color var(--transition-fast);
}
.btn-outline:hover { border-color: var(--brand); color: var(--brand); }
.processing-card { text-align: center; padding: 48px 24px; background: var(--bg-card); border-radius: var(--radius-xl); }
.processing-card h4 { margin: 12px 0 6px; font-size: 16px; color: var(--text-primary); }
.hint { font-size: 12px; color: var(--text-muted); }
.spinner { display: inline-block; width: 36px; height: 36px; border: 3px solid var(--input-border); border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.result-display { text-align: center; }
.result-image { max-width: 100%; max-height: 400px; border-radius: var(--radius-xl); box-shadow: var(--shadow-lg); margin-bottom: 16px; }
.result-actions { display: flex; gap: 10px; justify-content: center; }

@media (max-width: 640px) {
  .effect-grid { grid-template-columns: repeat(2, 1fr); }
  .step-content { padding: 0; }
}
</style>
