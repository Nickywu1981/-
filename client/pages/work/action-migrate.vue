<script setup lang="ts">
/** action-migrate — 动作迁移页面 */
import { ref } from 'vue'

definePageMeta({ layout: 'workspace', middleware: ['auth'] })
const { t } = useI18n()

const sourceVideo = ref('')
const productImage = ref('')
const duration = ref(10)
const style = ref<'ecommerce' | 'casual'>('ecommerce')
const loading = ref(false)
const result = ref<any>(null)
const error = ref('')

const submit = async () => {
  if (!sourceVideo.value || !productImage.value) return
  loading.value = true; error.value = ''; result.value = null
  try {
    const res = await fetch('/api/videos/action-migrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        source_video_url: sourceVideo.value,
        target_person_image: productImage.value,
        options: {
          duration: duration.value,
          style: style.value,
        },
        enhanced_options: {},
      }),
    })
    const data = await res.json()
    if (data.code !== 0) throw new Error(data.msg || '请求失败')
    result.value = data.data
  } catch (err: any) {
    error.value = err.message || '请求失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <WorkLayout :title="'动作迁移'">
    <div class="am-root">
      <div class="am-grid">
        <div class="am-field">
          <label class="am-label">源动作视频 URL</label>
          <input v-model="sourceVideo" class="am-input" placeholder="输入参考动作视频URL..." />
        </div>
        <div class="am-field">
          <label class="am-label">目标商品图 URL</label>
          <input v-model="productImage" class="am-input" placeholder="输入商品图片URL..." />
        </div>
      </div>

      <div class="am-row">
        <div class="am-field">
          <label class="am-label">时长 (秒)</label>
          <input v-model.number="duration" type="number" min="5" max="60" class="am-input" />
        </div>
        <div class="am-field">
          <label class="am-label">风格</label>
          <select v-model="style" class="am-input">
            <option value="ecommerce">专业电商带货</option>
            <option value="casual">休闲展示</option>
          </select>
        </div>
      </div>

      <button class="am-submit" :disabled="!sourceVideo || !productImage || loading" @click="submit">
        {{ loading ? '生成中...' : '开始动作迁移' }}
      </button>

      <div v-if="result" class="am-result">
        <div class="am-status">任务已提交 (Job ID: {{ result.job_id }})</div>
      </div>
      <div v-if="error" class="am-error">{{ error }}</div>
    </div>
  </WorkLayout>
</template>

<style scoped>
.am-root { max-width: 720px; margin: 0 auto; }
.am-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
.am-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
.am-field { margin-bottom: 8px; }
.am-label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 6px; color: var(--text-primary); }
.am-input { width: 100%; padding: 10px 12px; border: 1px solid var(--border-light); border-radius: var(--radius-md, 8px); font-size: 14px; background: var(--bg-page); color: var(--text-primary); }
.am-input:focus { border-color: var(--brand); outline: none; }
.am-submit { width: 100%; padding: 12px; border: none; border-radius: var(--radius-md, 8px); background: var(--brand); color: #fff; font-size: 16px; font-weight: 600; cursor: pointer; }
.am-submit:disabled { opacity: 0.4; cursor: not-allowed; }
.am-result { padding: 12px; margin-top: 12px; border-radius: var(--radius-md, 8px); background: var(--brand-alpha, rgba(99,102,241,0.06)); }
.am-status { font-size: 14px; color: var(--brand); }
.am-error { padding: 12px; margin-top: 12px; border-radius: var(--radius-md, 8px); background: rgba(239,68,68,0.06); color: var(--danger); font-size: 14px; }
</style>
