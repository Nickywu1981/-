/**
 * WebSocket 实时进度 composable
 *
 * 用法:
 *   const { progress, status, connect, disconnect } = useTaskProgress('t001');
 *   connect();
 *   // progress.value 实时更新
 */
export function useTaskProgress(taskId?: string) {
  const progress = ref(0);
  const status = ref('idle'); // idle | processing | completed | failed
  const error = ref('');
  const result = ref(null);

  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let intentionalClose = false;

  function connect() {
    if (!taskId) return;

    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const host = location.host || 'localhost:3001';
    const url = `${proto}://${host}/ws`;

    socket = new WebSocket(url);

    socket.onopen = () => {
      socket?.send(JSON.stringify({ type: 'subscribe_task', taskId }));
    };

    socket.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.taskId !== taskId) return;

        switch (msg.type) {
          case 'progress':
            progress.value = msg.progress;
            status.value = msg.status;
            break;
          case 'task_complete':
            progress.value = 100;
            status.value = 'completed';
            result.value = msg.result;
            break;
          case 'task_failed':
            status.value = 'failed';
            error.value = msg.error;
            break;
        }
      } catch { /* ignore */ }
    };

    socket.onclose = () => {
      if (!intentionalClose && status.value === 'processing') {
        reconnectTimer = setTimeout(() => connect(), 3000);
      }
    };

    socket.onerror = () => {
      socket?.close();
    };
  }

  function disconnect() {
    intentionalClose = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (socket) {
      socket.send(JSON.stringify({ type: 'unsubscribe_task', taskId }));
      socket.close();
      socket = null;
    }
  }

  onUnmounted(() => disconnect());

  return { progress, status, error, result, connect, disconnect };
}
