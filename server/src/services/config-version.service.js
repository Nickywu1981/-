/**
 * Movio AI v4.1 — Config Version Service
 * G5 后端开发 | T-G5-003 (NEW v4.1)
 * SSE 推送配置版本号，前端监听后静默刷新
 */
import { EventEmitter } from 'events';

const versionEmitter = new EventEmitter();
versionEmitter.setMaxListeners(200); // SSE 连接上限
let currentVersion = 0;

export function getCurrentVersion() {
  return currentVersion;
}

export async function broadcastVersion() {
  currentVersion++;
  versionEmitter.emit('version', { version: currentVersion });
  return currentVersion;
}

/**
 * SSE 中间件: GET /api/config/version/stream
 */
export function sseMiddleware(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const send = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // 首次连接发送当前版本
  send({ version: currentVersion });

  const onVersion = (data) => send(data);
  versionEmitter.on('version', onVersion);

  // 心跳保活 30s
  const heartbeat = setInterval(() => send({ heartbeat: true }), 30000);

  const cleanup = () => {
    versionEmitter.off('version', onVersion);
    clearInterval(heartbeat);
  };

  req.on('close', cleanup);
  res.on('error', cleanup);
}
