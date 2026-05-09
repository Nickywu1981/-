/**
 * ADK 核心原语 — Runner（执行引擎）
 * 编排 Agent 活动与事件流
 */
import { Session } from './session.js';
import { InvocationContext } from './invocationContext.js';
import { Event } from './event.js';

export class Runner {
  /**
   * @param {{ agent: import('./agent.js').BaseAgent, sessionService?: any, memoryService?: any, artifactService?: any }} opts
   */
  constructor(opts) {
    this.rootAgent = opts.agent;
    this.sessionService = opts.sessionService || new Map();
    this.memoryService = opts.memoryService || null;
    this.artifactService = opts.artifactService || null;
  }

  /**
   * 运行 Agent — 创建/恢复 Session，执行，返回结果
   * @param {{ userId: string|number, sessionId?: string, query: string, context?: object }} input
   */
  async run(input) {
    // 1) 获取或创建 session
    const session = await this._getOrCreateSession(input.userId, input.sessionId);
    const sessionId = session.id;

    // 2) 如果传入 query，写为 user event
    if (input.query) {
      session.pushEvent(new Event({ type: 'user.input', content: input.query }));
    }

    // 3) 注入上下文到 session.state
    if (input.context) {
      for (const [k, v] of Object.entries(input.context)) {
        session.state.set(k, v);
      }
    }

    // 4) 构建 InvocationContext
    const ctx = new InvocationContext({
      session,
      agentName: this.rootAgent.name,
      invocationId: `inv_${Date.now()}`,
    });
    if (this.memoryService) ctx.services.memory = this.memoryService;

    // 5) 执行
    const result = await this.rootAgent.runAsync(ctx);

    // 6) 持久化 session
    this.sessionService.set(sessionId, session);

    return { sessionId, result, events: session.events.length };
  }

  async _getOrCreateSession(userId, sessionId) {
    if (sessionId && this.sessionService.has(sessionId)) {
      return this.sessionService.get(sessionId);
    }
    return new Session({ userId });
  }
}
