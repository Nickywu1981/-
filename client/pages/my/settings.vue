<template>
  <div class="page">
    <h2>账户设置</h2>

    <LoadingSkeleton v-if="loading" type="form" :rows="3" />

    <div v-else>
      <div class="settings-section">
        <h3>基本信息</h3>
        <div class="form-group">
          <label>昵称</label>
          <input v-model="form.nickname" class="input-field" placeholder="输入昵称" />
        </div>
        <div class="form-group">
          <label>手机号</label>
          <input v-model="form.phone" class="input-field" placeholder="绑定手机号" disabled />
          <button class="btn-xs btn-outline">更换</button>
        </div>
        <div class="form-group">
          <label>邮箱</label>
          <input v-model="form.email" class="input-field" placeholder="绑定邮箱" />
        </div>
        <button class="btn" @click="saveProfile" :disabled="saving">
          {{ saving ? '保存中...' : '保存修改' }}
        </button>
      </div>

      <div class="settings-section">
        <h3>通知设置</h3>
        <div class="toggle-row" v-for="n in notificationSettings" :key="n.key">
          <div class="toggle-row__label">
            <span class="toggle-row__title">{{ n.label }}</span>
            <span class="toggle-row__desc">{{ n.desc }}</span>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" v-model="n.enabled" />
            <span class="toggle-slider" />
          </label>
        </div>
      </div>

      <div class="settings-section">
        <h3>主题偏好</h3>
        <div class="chips-row">
          <button v-for="t in themes" :key="t.key" class="chip" :class="{ active: selectedTheme === t.key }" @click="selectedTheme = t.key">
            {{ t.icon }} {{ t.label }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">


const toast = useToast()
const saving = ref(false)
const loading = ref(true)

const form = reactive({ nickname: '', phone: '', email: '' })

onMounted(async () => {
  loading.value = true
  try {
    const res: any = await $fetch('/api/user/profile', { credentials: 'include' })
    if (res.data) {
      form.nickname = res.data.nickname || ''
      form.phone = res.data.phone || ''
      form.email = res.data.email || ''
    }
  } catch { toast.error('加载用户信息失败，请刷新重试') }
  finally { loading.value = false }
})

const selectedTheme = ref('dark')
const themes = [
  { key: 'dark', label: '暗黑模式', icon: '🌙' },
  { key: 'light', label: '亮色模式', icon: '☀️' },
  { key: 'auto', label: '跟随系统', icon: '🔄' },
]

const notificationSettings = reactive([
  { key: 'task_complete', label: '任务完成通知', desc: 'AI 任务处理完成后推送通知', enabled: true },
  { key: 'credit_warn', label: '积分不足提醒', desc: '积分低于阈值时提醒', enabled: true },
  { key: 'marketing', label: '营销推送', desc: '优惠活动和功能更新通知', enabled: false },
])

const saveProfile = async () => {
  if (!form.nickname.trim()) { toast.warn('昵称不能为空'); return }
  saving.value = true
  try {
    await $fetch('/api/user/profile', { method: 'PUT', credentials: 'include', body: form })
    toast.success('保存成功')
  } catch { toast.error('保存失败') }
  saving.value = false
}
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>
