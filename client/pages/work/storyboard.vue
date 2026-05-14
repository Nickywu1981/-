<template>
  <WorkLayout :title="$t('work_pages.storyboard_title')" sub:title="$t('work_pages.storyboard_subtitle')" :steps="['输入脚本', '选择风格', '生成分镜']" :current-step="currentStep">
    <!-- Step 0-1: Input & Style -->
    <div v-if="currentStep < 2" class="ws-section">
      <div class="ws-section__title">{{ $t('work_pages.storyboard_script_title') }}</div>
      <div class="ws-section__desc">{{ $t('work_pages.storyboard_script_desc') }}</div>
      <textarea v-model="scriptText" class="input-area" :placeholder="$t('work_pages.storyboard_script_placeholder')" rows="8" maxlength="5000" />
      <div class="quick-tags">
        <span class="tag-label">{{ $t('work_pages.storyboard_quick_templates') }}</span>
        <button v-for="t in quickTemplates" :key="t.label" class="tag-btn" @click="scriptText = t.text">{{ t.label }}</button>
      </div>
      <PromptEnhancer v-if="scriptText.trim()" mode="script" :initial-prompt="scriptText" @applied="(v) => scriptText = v" />
      <div class="ws-section">
        <div class="ws-section__title">{{ $t('work_pages.storyboard_style_title') }}</div>
        <div class="style-chips">
          <button v-for="s in styles" :key="s.id" class="style-chip" :class="{ active: selectedStyle === s.id }" @click="selectedStyle = s.id">
            <span class="style-chip__icon">{{ s.icon }}</span>
            <span>{{ s.name }}</span>
          </button>
        </div>
      </div>
      <button class="btn" :disabled="!scriptText.trim() || submitting" @click="submitTask">
        {{ submitting ? $t('work_pages.submitting') : $t('work_pages.submit_btn') }}
      </button>
    </div>

    <!-- Step 2: Processing / Result -->
    <div v-else>
      <div v-if="submitting && !task.polling.value" class="progress-box">
        <div class="spinner" />
        <p>{{ $t('work_pages.storyboard_processing') }}</p>
      </div>
      <div v-else-if="task.polling.value" class="progress-box">
        <div class="spinner" />
        <p>{{ task.progressMsg.value }}</p>
      </div>
      <div v-else-if="task.status.value === 2" class="result-box">
        <h3>{{ $t('work_pages.storyboard_done') }}</h3>
        <div class="storyboard-grid" v-if="task.result.value?.scenes">
          <div v-for="(s, i) in task.result.value.scenes" :key="i" class="story-card">
            <div class="story-card__number">#{{ Number(i) + 1 }}</div>
            <img loading="lazy" v-if="s.image" :src="s.image" :alt="$t('work_pages.storyboard_img_alt')" class="story-card__img" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
            <div v-else class="story-card__placeholder">🎬</div>
            <div class="story-card__info">
              <div class="story-card__time">{{ s.duration || '3' }}s</div>
              <div class="story-card__desc">{{ s.description }}</div>
              <div class="story-card__camera">{{ s.camera || $t('work_pages.shot_camera_mid_fallback') }}</div>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">{{ $t('work_pages.storyboard_empty') }}</div>
        <button class="btn-outline" style="margin-top:16px" @click="handleReset">{{ $t('work_pages.storyboard_btn_reset') }}</button>
      </div>
      <div v-else-if="task.status.value === 3" class="error-box">
        <p class="error-msg">{{ task.errorMsg.value || $t('work_pages.storyboard_error') }}</p>
        <button class="btn" @click="handleReset">{{ $t('work_pages.storyboard_btn_reset') }}</button>
      </div>
    </div>
  </WorkLayout>
</template>

<script setup lang="ts">
import PromptEnhancer from '~/components/PromptEnhancer.vue'
const { t } = useI18n()


const currentStep = ref(0)

const scriptText = ref('')
const selectedStyle = ref('modern')

const styles = [
  { id: 'modern', name: '现代简约', icon: '🏠' },
  { id: 'cinematic', name: '电影质感', icon: '🎬' },
  { id: 'anime', name: '二次元', icon: '🎨' },
  { id: 'realistic', name: '写实风格', icon: '📷' },
  { id: 'minimal', name: '极简白底', icon: '⬜' },
]

const quickTemplates = [
  { label: '电商产品', text: '第一幕：产品360度旋转展示，突出材质和细节\n第二幕：模特使用场景，展示实际效果\n第三幕：产品卖点文字弹出，限时优惠信息\n第四幕：品牌LOGO + 购买链接' },
  { label: '美食教程', text: '第一幕：食材整齐排列，特写新鲜食材\n第二幕：烹饪过程，关键步骤慢动作\n第三幕：成品摆盘，诱人特写\n第四幕：试吃表情 + 详细食谱' },
]

// Task integration
const task = useTask()
const toast = useToast()
const submitting = ref(false)

async function submitTask() {
  if (!scriptText.value.trim()) { toast.warn('请输入脚本内容'); return }
  currentStep.value = 2
  submitting.value = true
  try {
    const res: any = await $fetch('/api/adv-video/shot-plan', { method: 'POST', body: { script: scriptText.value, style: selectedStyle.value } })
    if (res.data?.task_id) task.pollTask(res.data.task_id, '/api/adv-video/shot-plan/')
    else { toast.error('任务创建失败'); currentStep.value = 1; submitting.value = false; return }
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || t('common.failed_submit')); currentStep.value = 1 }
  finally { submitting.value = false }
}

function handleReset() {
  task.reset()
  currentStep.value = 1
}
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>
