/**
 * ADK 服务 — Agent-to-Agent 消息通信
 *
 * 借鉴 OpenClaw 的 sessions_send / A2A 模式：
 *   Agent 之间可以通过 sendToAgent() 直接发送消息，无需通过 session state 间接传递。
 *
 * 使用方式：
 *   ctx.sendToAgent('guard', { text: 'Check this content', platform: 'taobao' })
 *   ctx.onMessage('guard', async (msg, from) => { ... })
 */
import { EventEmitter } from 'events';
import logger from '../../utils/logger.js';

class AgentMessageBus extends EventEmitter {
  constructor() {
    super();
    /** @type {Map<string, Array<{from: string, payload: object, timestamp: number}>>} */
    this._inboxes = new Map();
    this.setMaxListeners(50);
  }

  /**
   * 向目标 Agent 发送消息
   * @param {string} fromAgent 发起方 Agent 名称
   * @param {string} toAgent 目标 Agent 名称
   * @param {object} payload 消息体
   * @returns {{ delivered: boolean, messageId: string }}
   */
  send(fromAgent, toAgent, payload) {
    const messageId = `a2a_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const message = { from: fromAgent, payload, timestamp: Date.now(), messageId };

    // 存入目标 inbox
    if (!this._inboxes.has(toAgent)) {
      this._inboxes.set(toAgent, []);
    }
    this._inboxes.get(toAgent).push(message);

    // 发射事件通知
    this.emit(`message:${toAgent}`, message);
    this.emit('message', { to: toAgent, ...message });

    logger.debug(`[A2A] ${fromAgent} → ${toAgent}: ${JSON.stringify(payload).slice(0, 100)}`);
    return { delivered: true, messageId };
  }

  /**
   * 轮询目标 Agent 的新消息（消费后清空）
   * @param {string} agentName
   * @returns {Array<{from: string, payload: object, timestamp: number, messageId: string}>}
   */
  poll(agentName) {
    const messages = this._inboxes.get(agentName) || [];
    this._inboxes.set(agentName, []);
    return messages;
  }

  /**
   * 查看目标 Agent 的消息（不消费）
   * @param {string} agentName
   * @returns {Array}
   */
  peek(agentName) {
    return this._inboxes.get(agentName) || [];
  }

  /**
   * 注册消息监听器
   * @param {string} agentName
   * @param {(msg: object) => void} handler
   */
  onMessage(agentName, handler) {
    this.on(`message:${agentName}`, handler);
  }

  /** 清空所有 inbox */
  reset() {
    this._inboxes.clear();
    this.removeAllListeners();
  }
}

/** 全局单例 */
const bus = new AgentMessageBus();

/**
 * 扩展 InvocationContext — 注入 sendToAgent / pollMessages / onMessage
 * @param {import('../core/invocationContext').InvocationContext} ctx
 */
export function injectA2A(ctx) {
  const agentName = ctx.agentName || 'unknown';

  ctx.sendToAgent = (toAgent, payload) => {
    return bus.send(agentName, toAgent, payload);
  };

  ctx.pollMessages = () => {
    return bus.poll(agentName);
  };

  ctx.onMessage = (handler) => {
    bus.onMessage(agentName, handler);
  };

  return ctx;
}

export { bus as agentMessageBus };
export default { injectA2A, agentMessageBus: bus };
