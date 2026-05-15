/**
 * ADK 核心原语 — Runner（执行引擎）
 * 编排 Agent 活动与事件流，Session 持久化到 Redis/DB
 */
import { Session } from './session.js';
import { InvocationContext } from './invocationContext.js';
import { Event } from './event.js';
import { SessionStore } from './sessionStore.js';
import { compactContext } from '../services/contextCompactionService.js';
import { augmentSystemPrompt, autoAbstractSkill } from '../services/skillLoaderService.js';
import { injectA2A } from '../services/agentMessageBus.js';
import logger from '../../utils/logger.js';

export class Runner {
  /**
   * @param {{ agent: import('./agent.js').BaseAgent, sessionService?: any, memoryService?: any, artifactService?: any }} opts
   */
  constructor(opts) {
    this.rootAgent = opts.agent;
    this.sessionService = opts.sessionService instanceof SessionStore
      ? opts.sessionService
      : (opts.sessionService || new SessionStore());
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

    // 4) Context Compaction — 自动触发 (借鉴 OpenClaw 记忆巩固)
    if (session.events && session.events.length > 30) {
      const { compressed, compactedCount } = await compactContext(session);
      if (compressed) {
        logger.info(`[Runner] Session ${sessionId}: compacted ${compactedCount} events`);
      }
    }

    // 5) Skill 惰性加载 — 按需注入相关 Skill 到 Prompt (借鉴 OpenClaw)
    if (input.query && !input.context?.systemPrompt) {
      const augmented = augmentSystemPrompt(input.query, input.context?.systemPrompt || '');
      if (augmented) {
        session.state.set('_lazySkills', augmented);
      }
    }

    // 6) 构建 InvocationContext (注入 services)
    const ctx = new InvocationContext({
      session,
      agentName: this.rootAgent.name,
      invocationId: `inv_${Date.now()}`,
    });
    if (this.memoryService) ctx.services.memory = this.memoryService;
    if (this.artifactService) ctx.services.artifact = this.artifactService;

    // 7) A2A 消息通信注入 (借鉴 OpenClaw)
    injectA2A(ctx);

    // 8) 执行
    const result = await this.rootAgent.runAsync(ctx);

    // 9) L1 技能自动抽象 — 工具调用 ≥5 次自动生成 .skill 文件
    const toolCalls = session.events.filter(e => e.type === 'agent.tool_call').length
      + session.events.filter(e => e.type === 'agent.tool_result').length;
    if (toolCalls >= 5 && input.query) {
      // 从 Query 中提取任务模式标识（取前 60 字符作为模式 key）
      const taskPattern = input.query.slice(0, 60).replace(/\n/g, ' ').trim();
      autoAbstractSkill(taskPattern, toolCalls, {
        description: `从 ${toolCalls} 次工具调用中自动抽象`,
        tags: ['auto', 'learned'],
        promptSnippet: `## ${taskPattern}\n\n自动抽象技能。\n\n累计工具调用: ${toolCalls}\n原始任务: ${input.query.slice(0, 200)}`,
      }).then(r => {
        if (r.abstracted) {
          logger.info(`[Runner] L1 auto-abstracted new skill: ${r.skillName}`);
        }
      }).catch(() => {});
    }

    // 10) 持久化 session (Redis with Map fallback)
    await this.sessionService.set(sessionId, session);

    return { sessionId, result, events: session.events.length };
  }

  async _getOrCreateSession(userId, sessionId) {
    if (sessionId) {
      const existing = await this.sessionService.get(sessionId);
      if (existing) {
        // 水化 Session 对象
        if (existing instanceof Session) return existing;
        const s = new Session(existing);
        return s;
      }
    }
    return new Session({ userId });
  }
}
