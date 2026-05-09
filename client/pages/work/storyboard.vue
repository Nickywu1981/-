<template>
  <WorkLayout title="智能分镜生成" subtitle="AI 脚本→分镜画面→配音→字幕全流程" :steps="steps" :current-step="currentStep">
    <template #input>
      <div class="ws-section">
        <div class="ws-section__title">输入视频脚本</div>
        <div class="ws-section__desc">粘贴文案脚本，AI 自动拆分为分镜画面</div>
        <textarea v-model="scriptText" class="input-area" placeholder="粘贴你的视频脚本...&#10;&#10;如：第一幕：清晨阳光洒进卧室，女主起床伸懒腰&#10;第二幕：走到厨房，打开冰箱拿出一瓶牛奶&#10;第三幕：喝牛奶特写，满足的笑容" rows="8" />
        <div class="quick-tags">
          <span class="tag-label">快捷模板：</span>
          <button v-for="t in quickTemplates" :key="t.label" class="tag-btn" @click="scriptText = t.text">{{ t.label }}</button>
        </div>
      </div>
      <div class="ws-section">
        <div class="ws-section__title">画面风格</div>
        <div class="style-chips">
          <button v-for="s in styles" :key="s.id" class="style-chip" :class="{ active: selectedStyle === s.id }" @click="selectedStyle = s.id">
            <span class="style-chip__icon">{{ s.icon }}</span>
            <span>{{ s.name }}</span>
          </button>
        </div>
      </div>
    </template>

    <template #processing>
      <div v-if="submitting" class="progress-box">
        <div class="spinner" />
        <p>正在提交任务...</p>
      </div>
      <div v-else-if="task.polling.value" class="progress-box">
        <div class="spinner" />
        <p>{{ task.progressMsg.value }}</p>
      </div>
      <div v-else-if="task.status.value === 2" class="result-box">
        <h3>分镜生成完成</h3>
        <div class="storyboard-grid" v-if="task.result.value?.scenes">
          <div v-for="(s, i) in task.result.value.scenes" :key="i" class="story-card">
            <div class="story-card__number">#{{ Number(i) + 1 }}</div>
            <img v-if="s.image" :src="s.image" class="story-card__img" />
            <div v-else class="story-card__placeholder">🎬</div>
            <div class="story-card__info">
              <div class="story-card__time">{{ s.duration || '3' }}s</div>
              <div class="story-card__desc">{{ s.description }}</div>
              <div class="story-card__camera">{{ s.camera || '中景' }}</div>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">暂无分镜数据</div>
      </div>
    </template>
  </WorkLayout>
</template>

<script setup lang="ts">

const currentStep = ref(0)
const steps = ['输入脚本', '选择风格', '生成分镜']

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

const submitTask = async () => {
  if (!scriptText.value.trim()) { toast.warn('请输入脚本内容'); return }
  currentStep.value = 2
  submitting.value = true
  try {
    const res: any = await $fetch('/api/adv-video/shot-plan', { method: 'POST', body: { script: scriptText.value, style: selectedStyle.value } })
    if (res.data?.task_id) task.pollTask(res.data.task_id, '/api/adv-video/shot-plan/')
  } catch (e: any) { toast.error(e.data?.msg || '提交失败') }
  finally { submitting.value = false }
}

watch(currentStep, (v) => { if (v === 2 && !task.taskId.value) submitTask() })
</script>
