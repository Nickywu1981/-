<template>
  <div class="page">
    <h2>{{ $t('my.settings.page_title') }}</h2>

    <LoadingSkeleton v-if="loading" type="form" :rows="3" />

    <div v-else>
      <div class="settings-section">
        <h3>{{ $t('my.settings.basic_info') }}</h3>
        <div class="form-group">
          <label>{{ $t('my.settings.nickname') }}</label>
          <input v-model="form.nickname" class="input-field" :placeholder="$t('my.settings.nickname_placeholder')" />
        </div>
        <div class="form-group">
          <label>{{ $t('my.settings.phone') }}</label>
          <input v-model="form.phone" class="input-field" :placeholder="$t('my.settings.phone_placeholder')" disabled />
          <button class="btn-xs btn-outline">{{ $t('my.settings.change') }}</button>
        </div>
        <div class="form-group">
          <label>{{ $t('my.settings.email') }}</label>
          <input v-model="form.email" class="input-field" :placeholder="$t('my.settings.email_placeholder')" />
        </div>
        <button class="btn" @click="saveProfile" :disabled="saving">
          {{ saving ? $t('my.settings.saving') : $t('my.settings.save') }}
        </button>
      </div>

      <div class="settings-section">
        <h3>{{ $t('my.settings.notifications') }}</h3>
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
        <h3>{{ $t('my.settings.theme_pref') }}</h3>
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

const { t } = useI18n()
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
  } catch { toast.error(t('my.settings.load_failed')) }
  finally { loading.value = false }
})

const selectedTheme = ref('dark')
const themes = [
  { key: 'dark', label: t('my.settings.theme_dark'), icon: '🌙' },
  { key: 'light', label: t('my.settings.theme_light'), icon: '☀️' },
  { key: 'auto', label: t('my.settings.theme_auto'), icon: '🔄' },
]

const notificationSettings = reactive([
  { key: 'task_complete', label: t('my.settings.notif_task_complete'), desc: t('my.settings.notif_task_complete_desc'), enabled: true },
  { key: 'credit_warn', label: t('my.settings.notif_credit_warn'), desc: t('my.settings.notif_credit_warn_desc'), enabled: true },
  { key: 'marketing', label: t('my.settings.notif_marketing'), desc: t('my.settings.notif_marketing_desc'), enabled: false },
])

const saveProfile = async () => {
  if (!form.nickname.trim()) { toast.warn(t('my.settings.nickname_required')); return }
  saving.value = true
  try {
    await $fetch('/api/user/profile', { method: 'PUT', credentials: 'include', body: form })
    toast.success(t('my.settings.save_success'))
  } catch { toast.error(t('my.settings.save_failed')) }
  saving.value = false
}
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>
