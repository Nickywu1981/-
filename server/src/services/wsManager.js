import { WebSocketServer } from 'ws';
import { parse } from 'url';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import logger from '../utils/logger.js';

const JWT_SECRET = config.jwt.secret;

function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  const result = {};
  cookieHeader.split(';').forEach(c => {
    const [key, ...rest] = c.trim().split('=');
    if (key) result[key] = decodeURIComponent(rest.join('='));
  });
  return result;
}

/**
 * WebSocket 实时进度管理器
 *
 * 连接: ws://localhost:3001/ws
 * 认证: 从 httpOnly cookie 读取 token (WebSocket upgrade 自动携带 cookie)
 * 消息格式: { type: "subscribe_task", taskId: "t001" }
 * 推送格式: { type: "progress", taskId: "t001", progress: 65, status: "processing" }
 */
class WsManager {
  constructor() {
    /** @type {Map<string, Set<import('ws').WebSocket>>}  taskId → sockets */
    this.taskRooms = new Map();
    /** @type {Map<string, import('ws').WebSocket>}  userId → socket */
    this.userSockets = new Map();
    /** @type {Map<string, Set<import('ws').WebSocket>>}  ip → sockets */
    this.ipConnections = new Map();
    /** @type {Map<import('ws').WebSocket, number>}  socket → lastMessageTs */
    this.msgTimestamps = new Map();
    /** @type {Map<import('ws').WebSocket, string>}  socket → userId */
    this.socketUsers = new Map();
    /** @type {Map<string, string>}  taskId → ownerUserId */
    this.taskOwners = new Map();
    /** @type {WebSocketServer | null} */
    this.wss = null;
  }

  /** 挂载到 HTTP server */
  attach(server) {
    this.wss = new WebSocketServer({ server, path: '/ws', maxPayload: 64 * 1024 });

    // 心跳检测：可通过 WS_HEARTBEAT_MS 配置间隔
    const heartbeatMs = config.ws?.heartbeatIntervalMs || 30000;
    const interval = setInterval(() => {
      this.wss?.clients.forEach((ws) => {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
      });
    }, heartbeatMs);
    this.wss.on('close', () => clearInterval(interval));

    this.wss.on('connection', (socket, req) => {
      socket.isAlive = true;
      socket.on('pong', () => { socket.isAlive = true; });

      const clientIp = req.socket?.remoteAddress || 'unknown';

      // 每 IP 最多 5 个并发连接
      if (!this.ipConnections.has(clientIp)) {
        this.ipConnections.set(clientIp, new Set());
      }
      const ipSockets = this.ipConnections.get(clientIp);
      if (ipSockets.size >= (config.ws?.maxConnectionsPerIp || 5)) {
        socket.close(4002, '连接数过多');
        return;
      }
      ipSockets.add(socket);

      // 仅通过 JWT cookie 认证，拒绝匿名连接
      const cookies = parseCookies(req.headers.cookie);
      let userId = null;
      try {
        const payload = jwt.verify(cookies.token || '', JWT_SECRET);
        userId = String(payload.userId || payload.id);
      } catch {
        // 未认证连接 — 关闭连接，不提供公开订阅
        socket.close(4001, '未授权');
        return;
      }

      if (userId) {
        const existing = this.userSockets.get(userId);
        if (existing && existing !== socket) {
          this._unsubscribeAll(existing);
          if (existing.readyState === 1) existing.close(4000, '新连接替代');
        }
        this.userSockets.set(userId, socket);
        this.socketUsers.set(socket, userId);
      }

      // Rate limit: max 20 messages/sec per socket
      socket.on('message', (raw) => {
        const now = Date.now();
        const last = this.msgTimestamps.get(socket) || 0;
        if (now - last < 50) {
          socket.close(4003, '消息频率过高');
          return;
        }
        this.msgTimestamps.set(socket, now);
        try {
          const msg = JSON.parse(raw.toString());
          this._handle(socket, msg);
        } catch (e) {
          logger.warn('[WS] 畸形消息', { error: e.message });
        }
      });

      socket.on('close', () => {
        if (userId) this.userSockets.delete(String(userId));
        this._unsubscribeAll(socket);
        this.msgTimestamps.delete(socket);
        this.socketUsers.delete(socket);
        ipSockets.delete(socket);
        if (ipSockets.size === 0) this.ipConnections.delete(clientIp);
      });

      socket.send(JSON.stringify({ type: 'connected', userId }));
    });
  }

  _handle(socket, msg) {
    const userId = this.socketUsers.get(socket);
    switch (msg.type) {
      case 'subscribe_task': {
        if (!msg.taskId) break;
        // Enforce task ownership: only the task owner can subscribe
        const owner = this.taskOwners.get(msg.taskId);
        if (owner && owner !== userId) {
          socket.send(JSON.stringify({ type: 'error', message: '无权订阅此任务' }));
          break;
        }
        const room = this.taskRooms.get(msg.taskId);
        if (room) room.add(socket);
        else this.taskRooms.set(msg.taskId, new Set([socket]));
        break;
      }
      case 'unsubscribe_task': {
        if (!msg.taskId) break;
        const room = this.taskRooms.get(msg.taskId);
        if (room) {
          room.delete(socket);
          if (room.size === 0) this.taskRooms.delete(msg.taskId);
        }
        break;
      }
    }
  }

  _unsubscribeAll(socket) {
    for (const [taskId, room] of this.taskRooms.entries()) {
      room.delete(socket);
      if (room.size === 0) this.taskRooms.delete(taskId);
    }
  }

  // ============= 推送方法（被 Service 层调用） =============

  /** 推送任务进度 */
  pushProgress(taskId, progress, status) {
    const room = this.taskRooms.get(taskId);
    if (!room) return;
    const payload = JSON.stringify({ type: 'progress', taskId, progress: Math.min(100, Math.max(0, progress)), status });
    for (const s of room) {
      if (s.readyState === 1) s.send(payload);
    }
  }

  /** 推送任务完成 */
  pushTaskComplete(taskId, result) {
    const room = this.taskRooms.get(taskId);
    if (!room) return;
    const payload = JSON.stringify({ type: 'task_complete', taskId, progress: 100, status: 'completed', result });
    for (const s of room) {
      if (s.readyState === 1) s.send(payload);
    }
  }

  /** 推送任务失败 */
  pushTaskFailed(taskId, error) {
    const room = this.taskRooms.get(taskId);
    if (!room) return;
    const payload = JSON.stringify({ type: 'task_failed', taskId, error: String(error) });
    for (const s of room) {
      if (s.readyState === 1) s.send(payload);
    }
  }

  /** 推送给指定用户 */
  pushToUser(userId, data) {
    const s = this.userSockets.get(String(userId));
    if (s && s.readyState === 1) s.send(JSON.stringify(data));
  }

  /** 注册任务所有者（Service 层在创建任务时调用） */
  registerTaskOwner(taskId, userId) {
    this.taskOwners.set(taskId, String(userId));
  }

  /** 注销任务所有者（任务完成/失败后清理） */
  unregisterTask(taskId) {
    this.taskOwners.delete(taskId);
  }

  /** 广播系统通知（管理员用） */
  broadcast(data) {
    if (!this.wss) return;
    const payload = JSON.stringify(data);
    for (const s of this.wss.clients) {
      if (s.readyState === 1) s.send(payload);
    }
  }
}

export default new WsManager();
