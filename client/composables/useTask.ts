/**
 * 任务状态轮询 composable
 * 用于所有 AI 生成任务的状态追踪
 */
export function useTask() {
  const taskId = ref('');
  const status = ref(-1); // -1=未提交 0=排队 1=处理中 2=完成 3=失败
  const progress = ref(0);
  const progressMsg = ref('');
  const result = ref<any>(null);
  const errorMsg = ref('');
  const polling = ref(false);

  let timer: ReturnType<typeof setInterval> | null = null;

  async function pollTask(id: string, baseUrl = '/api/images/tasks/') {
    taskId.value = id;
    polling.value = true;
    status.value = 0;

    timer = setInterval(async () => {
      try {
        const res = await $fetch(`${baseUrl}${id}`, {
          credentials: 'include',
        });
        const data = (res as any).data;
        status.value = data.status;
        progress.value = data.progress;
        progressMsg.value = data.progress_msg;

        if (data.status === 2) {
          result.value = data.output_result;
          stopPolling();
        } else if (data.status === 3) {
          errorMsg.value = data.error_msg || '任务失败';
          stopPolling();
        }
      } catch {
        // 网络错误不中断轮询
      }
    }, 1000);
  }

  function stopPolling() {
    polling.value = false;
    if (timer) { clearInterval(timer); timer = null; }
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
