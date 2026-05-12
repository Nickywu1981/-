/**
 * 任务状态轮询 composable
 * 用于所有 AI 生成任务的状态追踪
 */
import { POLL_INTERVAL_MS, POLL_BACKOFF_MS } from '~/constants/ui'

export function useTask() {
  const { t } = useI18n()
  const taskId = ref('');
  const status = ref(-1); // -1=未提交 0=排队 1=处理中 2=完成 3=失败
  const progress = ref(0);
  const progressMsg = ref('');
  const result = ref<any>(null);
  const errorMsg = ref('');
  const polling = ref(false);

  let timer: ReturnType<typeof setTimeout> | null = null;
  let pollCount = 0;
  let consecutiveFailures = 0;
  let currentInterval = 1000;

  async function pollTask(id: string, baseUrl = '/api/images/tasks/') {
    taskId.value = id;
    polling.value = true;
    status.value = 0;
    pollCount = 0;
    consecutiveFailures = 0;
    currentInterval = 1000;

    const doPoll = async () => {
      if (!polling.value) return;
      try {
        const res = await $fetch(`${baseUrl}${id}`, { credentials: 'include' });
        const data = (res as any).data;
        status.value = data.status;
        progress.value = data.progress;
        progressMsg.value = data.progress_msg;
        consecutiveFailures = 0;

        if (data.status === 2) {
          result.value = data.output_result;
          stopPolling();
          return;
        } else if (data.status === 3) {
          errorMsg.value = data.error_msg || t('task.failed');
          stopPolling();
          return;
        }
      } catch (err: any) {
        if (import.meta.dev) console.warn('[useTask] 轮询请求失败', err?.message || err)
        consecutiveFailures++;
        // 连续失败 3 次后报告错误状态
        if (consecutiveFailures >= 3) {
          errorMsg.value = t('task.network_error');
          stopPolling();
          return;
        }
      }

      // 自适应退避: 前5秒1s, 之后3s, 连续失败>3次则5s (but bail at 3)
      pollCount++;
      if (consecutiveFailures > 3) currentInterval = POLL_BACKOFF_MS;
      else if (pollCount > 5) currentInterval = POLL_INTERVAL_MS;

      if (polling.value) timer = setTimeout(doPoll, currentInterval) as any;
    };

    timer = setTimeout(doPoll, 1000) as any;
  }

  function stopPolling() {
    polling.value = false;
    if (timer) { clearTimeout(timer); timer = null; }
  }

  function reset() {
    stopPolling();
    taskId.value = '';
    status.value = -1;
    progress.value = 0;
    progressMsg.value = '';
    result.value = null;
    errorMsg.value = '';
  }

  onUnmounted(() => stopPolling());

  return { taskId, status, progress, progressMsg, result, errorMsg, polling, pollTask, reset };
}
