/**
 * Movio AI — 自定义 Service Worker 策略
 *
 * 由 @vite-pwa/nuxt 的 workbox 注入，扩展以下能力：
 *   1. Background Sync — POST 请求失败时排队重试
 *   2. 更精细的缓存策略矩阵
 *   3. Push 通知事件处理（预留）
 */

/// <reference lib="webworker" />

// @ts-ignore: __WB_MANIFEST is injected by workbox at build time
declare let self: ServiceWorkerGlobalScope;

// ==================== Background Sync ====================

const FAILED_POST_QUEUE = 'movio-api-queue';
const MAX_RETENTION_MS = 24 * 60 * 60 * 1000; // 24h

// 从 workbox-background-sync 中内联核心逻辑
// @vite-pwa/nuxt 会自动注入 workbox 模块，但 BackgroundSyncPlugin
// 需要在 workbox.strategies 中使用
// 这里声明扩展以便 build 时 workbox 正确处理

// Event: 后台同步触发
self.addEventListener('sync', (event: ExtendableEvent) => {
  if (event.tag === FAILED_POST_QUEUE) {
    event.waitUntil(replayFailedRequests());
  }
});

async function replayFailedRequests() {
  try {
    const cache = await caches.open(FAILED_POST_QUEUE);
    const keys = await cache.keys();
    const now = Date.now();

    for (const request of keys) {
      try {
        const response = await cache.match(request);
        if (!response) continue;

        // 检查是否过期
        const timestamp = parseInt(response.headers.get('X-Queue-Timestamp') || '0');
        if (timestamp && now - timestamp > MAX_RETENTION_MS) {
          await cache.delete(request);
          continue;
        }

        // 重放请求
        const body = await response.clone().text();
        const replayRequest = new Request(request.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        });

        const serverResponse = await fetch(replayRequest);
        if (serverResponse.ok) {
          await cache.delete(request);
        }
      } catch {
        // 仍失败，保留在队列中
      }
    }
  } catch { /* 降级 */ }
}

async function enqueueFailedRequest(url: string, body: string) {
  try {
    const cache = await caches.open(FAILED_POST_QUEUE);
    const headers = new Headers({
      'Content-Type': 'application/json',
      'X-Queue-Timestamp': Date.now().toString(),
    });
    const stored = new Response(body, { headers });
    const req = new Request(url, { method: 'POST' });
    await cache.put(req, stored);
  } catch { /* 降级 */ }
}

// ==================== Push 通知 (预留) ====================

self.addEventListener('push', (event: PushEvent) => {
  const data = event.data?.json() || {};
  const title = data.title || 'Movio AI';
  const options: NotificationOptions = {
    body: data.body || '您有新的通知',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: data.tag || 'movio-notification',
    data: data.data || {},
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// ==================== 消息通道 ====================

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'MANUAL_SYNC') {
    event.waitUntil(replayFailedRequests());
  }
});

export {};
