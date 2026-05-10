/**
 * Movio AI v4.1 — useTaskPolling
 * G4 前端开发 | 任务轮询 + 防重复提交
 *
 * 用法:
 *   const { status, progress, result, submit, poll } = useTaskPolling()
 *   await submit('video_gen', { prompt: '...' })
 *   // 自动轮询直到 completed/failed
 */
import { ref, onUnmounted, onDeactivated, onActivated } from 'vue'
import { useRuntimeConfig } from '#app'

export function useTaskPolling() {
  const jobId = ref<number | null>(null)
  const status = ref<string>('idle') // idle | queued | processing | completed | failed
  const progress = ref(0)
  const result = ref<any>(null)
  const error = ref<string>('')
  const submitting = ref(false)
  const pollTimer = ref<NodeJS.Timeout | null>(null)
  const apiBase = useRuntimeConfig().public.apiBase || '/api'

  // -----------------------------------------------------------------------
  // 提交任务 (防重复提交)
  // -----------------------------------------------------------------------
  async function submit(taskType: string, params: Record<string, any>) {
    if (submitting.value) {
      useToast().warn('任务进行中，请等待完成后再提交')
      return
    }
    if (jobId.value && ['queued', 'processing'].includes(status.value)) {
      useToast().warn('已有进行中的任务，请等待完成后再提交')
      return
    }

    submitting.value = true
    status.value = 'queued'
    error.value = ''

    try {
      const res: any = await $fetch(`${apiBase}/jobs`, {
        method: 'POST',
        body: { task_type: taskType, task_params: params },
        credentials: 'include',
      })
      if (res.code === 200) {
        jobId.value = res.data.job_id
        status.value = 'queued'
        startPolling()
      } else {
        status.value = 'failed'
        error.value = res.msg || '任务提交失败'
      }
    } catch (e: any) {
      status.value = 'failed'
      error.value = e.data?.msg || e.message || '任务提交失败'
      useToast().error(e.data?.msg || e.message || '任务提交失败，请重试')
    } finally {
      submitting.value = false
    }
  }

  // -----------------------------------------------------------------------
  // 轮询
  // -----------------------------------------------------------------------
  function startPolling() {
    stopPolling()
    pollTimer.value = setInterval(async () => {
      if (!_active || !jobId.value) return
      try {
        const res: any = await $fetch(`${apiBase}/job/${jobId.value}`, { credentials: 'include' })
        if (res.code === 200) {
          status.value = res.data.status
          progress.value = res.data.progress || 0
          if (res.data.status === 'completed') {
            result.value = res.data.result_data
            stopPolling()
          } else if (res.data.status === 'failed') {
            error.value = res.data.error_message || '任务失败'
            stopPolling()
          }
        }
      } catch {
        // 轮询失败不中断
      }
    }, 3000) // 每3秒轮询
  }

  function stopPolling() {
    if (pollTimer.value) {
      clearInterval(pollTimer.value)
      pollTimer.value = null
    }
  }

  function reset() {
    stopPolling()
    jobId.value = null
    status.value = 'idle'
    progress.value = 0
    result.value = null
    error.value = ''
    submitting.value = false
  }

  let _active = true
  onUnmounted(() => { _active = false; stopPolling() })
  onDeactivated(() => { _active = false; stopPolling() })
  onActivated(() => { _active = true })

  return { jobId, status, progress, result, error, submitting, submit, stopPolling, reset }
}
