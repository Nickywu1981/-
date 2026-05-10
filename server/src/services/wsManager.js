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
    /** @type {WebSocketServer | null} */
    this.wss = null;
  }

  /** 挂载到 HTTP server */
  attach(server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (socket, req) => {
      // 从 cookie 中读取 JWT token 认证
      const cookies = parseCookies(req.headers.cookie);
      let userId = null;
      try {
        const payload = jwt.verify(cookies.token || '', JWT_SECRET);
        userId = String(payload.id);
      } catch {
        // 匿名连接 (仅允许订阅公开任务进度)
        userId = null;
      }

      // 也兼容 query param userId (向后兼容)
      const query = parse(req.url || '/', true).query;
      if (!userId && query.userId) userId = String(query.userId);

      if (userId) this.userSockets.set(userId, socket);

      socket.on('message', (raw) => {
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
      });

      socket.send(JSON.stringify({ type: 'connected', userId }));
    });
  }

  _handle(socket, msg) {
    switch (msg.type) {
      case 'subscribe_task': {
        const room = this.taskRooms.get(msg.taskId);
        if (room) room.add(socket);
        else this.taskRooms.set(msg.taskId, new Set([socket]));
        break;
      }
      case 'unsubscribe_task': {
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
