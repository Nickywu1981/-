/**
 * WebSocket 客户端 — 订阅批量任务实时进度
 *
 * 使用:
 *   const { connect, subscribe, progressMap } = useTaskSocket();
 *   await connect(userId);
 *   subscribe(taskId);
 *   // progressMap 是响应式 Map，UI 直接绑定
 *
 * 消息类型:
 *   connected → 连接成功
 *   progress → { taskId, progress, status }
 *   task_complete → { taskId, result }
 *   task_failed → { taskId, error }
 */

export function useTaskSocket() {
  const isConnected = ref(false);
  const progressMap = reactive(new Map<string, { progress: number; status: string; result?: any; error?: string }>());
  const MAX_ENTRIES = 100;
  let socket: WebSocket | null = null;

  async function connect(_uid?: string) {
    if (socket?.readyState === WebSocket.OPEN) return;

    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    const host = location.host || 'localhost:3001';
    const url = `${protocol}://${host}/ws`;

    socket = new WebSocket(url);

    socket.onopen = () => {
      isConnected.value = true;
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'connected':
            break;
          case 'progress':
          case 'task_complete':
          case 'task_failed':
            progressMap.set(msg.taskId, {
              progress: msg.progress ?? 0,
              status: msg.status ?? 'processing',
              result: msg.result,
              error: msg.error,
            });
            // 修剪旧条目：超过上限时删除最早完成/失败的条目
            if (progressMap.size > MAX_ENTRIES) {
              const keys = [...progressMap.keys()];
              for (const k of keys) {
                if (progressMap.size <= MAX_ENTRIES) break;
                const v = progressMap.get(k);
                if (v?.status === 'completed' || v?.status === 'failed') {
                  progressMap.delete(k);
                }
              }
            }
            break;
        }
      } catch { /* malformed */ }
    };

    socket.onclose = () => {
      isConnected.value = false;
      socket = null;
    };

    socket.onerror = () => {
      isConnected.value = false;
    };
  }

  function subscribe(taskId: string) {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'subscribe_task', taskId }));
    }
  }

  function unsubscribe(taskId: string) {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'unsubscribe_task', taskId }));
    }
    progressMap.delete(taskId);
  }

  function disconnect() {
    if (socket) {
      socket.close();
      socket = null;
    }
    isConnected.value = false;
  }

  onUnmounted(() => disconnect());

  return { connect, subscribe, unsubscribe, disconnect, isConnected, progressMap };
}
