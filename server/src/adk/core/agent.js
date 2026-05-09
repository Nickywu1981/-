/**
 * ADK 核心原语 — Agent（智能体）
 * BaseAgent: 抽象策略基类
 * LlmAgent: LLM 驱动 Agent（对应 ADK LlmAgent）
 */
import { Event } from './event.js';
import { InvocationContext } from './invocationContext.js';
import logger from '../../utils/logger.js';
import { BusinessError } from '../../utils/errors.js';
import { ERROR_CODE } from '../../constants/errorCode.js';

// ======================== BaseAgent ========================
export class BaseAgent {
  /**
   * @param {{ name: string, description?: string, instruction?: string, tools?: import('./tool.js').FunctionTool[]|import('./tool.js').AgentTool[], subAgents?: BaseAgent[], outputKey?: string, outputSchema?: object }} opts
   */
  constructor(opts) {
    this.name = opts.name;
    this.description = opts.description || '';
    this.instruction = opts.instruction || '';
    this.tools = opts.tools || [];
    this.subAgents = opts.subAgents || [];
    this.outputKey = opts.outputKey || null;
    this.outputSchema = opts.outputSchema || null;

    // 生命周期钩子
    this.beforeAgentCallbacks = [];
    this.afterAgentCallbacks = [];
    this.beforeToolCallbacks = [];
    this.afterToolCallbacks = [];
  }

  /** 子类实现主逻辑 */
  async _runAsyncImpl(ctx) {
    throw new BusinessError(ERROR_CODE.INTERNAL_ERROR, `Agent "${this.name}": _runAsyncImpl must be implemented`);
  }

  /** 执行入口 */
  async runAsync(ctx) {
    const event = new Event({ type: 'agent.start', agentName: this.name, invocationId: ctx.invocationId });
    ctx.session.pushEvent(event);

    try {
      for (const cb of this.beforeAgentCallbacks) await cb(ctx);
      const result = await this._runAsyncImpl(ctx);
      for (const cb of this.afterAgentCallbacks) await cb(ctx, result);

      if (this.outputKey && result) {
        ctx.setState(this.outputKey, result);
      }

      ctx.session.pushEvent(new Event({ type: 'agent.end', agentName: this.name, content: result, invocationId: ctx.invocationId }));
      return result;
    } catch (err) {
      ctx.session.pushEvent(new Event({ type: 'agent.error', agentName: this.name, content: { error: err.message }, invocationId: ctx.invocationId }));
      throw err;
    }
  }

  /** 管道: before */
  onBefore(cb) { this.beforeAgentCallbacks.push(cb); return this; }

  /** 管道: after */
  onAfter(cb) { this.afterAgentCallbacks.push(cb); return this; }

  /** 管道: beforeTool */
  onBeforeTool(cb) { this.beforeToolCallbacks.push(cb); return this; }

  /** 管道: afterTool */
  onAfterTool(cb) { this.afterToolCallbacks.push(cb); return this; }
}

// ======================== LlmAgent ========================
export class LlmAgent extends BaseAgent {
  /**
   * @param {{ name: string, description?: string, instruction?: string, model?: string, tools?: object[], subAgents?: BaseAgent[], outputKey?: string, outputSchema?: object, generateContentConfig?: object }} opts
   */
  constructor(opts) {
    super(opts);
    this.model = opts.model || 'deepseek-v4-pro';
    this.generateContentConfig = opts.generateContentConfig || { temperature: 0.7, maxOutputTokens: 4096 };
  }

  async _runAsyncImpl(ctx) {
    // 1) 构建 system prompt（instruction）
    const systemPrompt = this._buildSystemPrompt(ctx);

    // 2) 合并工具
    const allTools = [...this.tools];

    // 3) 构建消息列表
    const messages = this._buildMessages(ctx, systemPrompt);

    // 4) 调用 AI 引擎
    const engine = null; // await getAiEngine() — 用直接 HTTP 调用替代
    const result = await this._callModel(ctx, messages, allTools, systemPrompt);

    return result;
  }

  _buildSystemPrompt(ctx) {
    let prompt = this.instruction;
    // 注入 session state 中的上下文变量
    const state = ctx.session.state.getAll();
    for (const [k, v] of Object.entries(state)) {
      if (typeof v === 'string' && prompt.includes(`{${k}}`)) {
        prompt = prompt.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
      }
    }
    return prompt;
  }

  _buildMessages(ctx, systemPrompt) {
    const messages = [{ role: 'system', content: systemPrompt }];
    // 注入最近 N 个历史 events
    const history = ctx.session.events.slice(-10);
    for (const ev of history) {
      if (ev.type === 'agent.end' && ev.content) {
        messages.push({ role: 'assistant', content: typeof ev.content === 'string' ? ev.content : JSON.stringify(ev.content) });
      }
    }
    return messages;
  }

  /**
   * 实际调用模型 — 通过 aiEngine 统一调度
   */
  async _callModel(ctx, messages, tools, systemPrompt) {
    try {
      const { infer } = await import('../../services/aiEngine.js');
      if (infer) {
        const result = await infer(this.model, messages, {
          temperature: this.generateContentConfig.temperature,
          maxTokens: this.generateContentConfig.maxOutputTokens,
        });
        return result.text || result.content || result;
      }
    } catch (err) {
      logger.warn(`[ADK] Primary model "${this.model}" call failed: ${err.message}, falling back to modelDispatcher`);
      try {
        const { dispatch } = await import('../../services/modelDispatcher.js');
        if (dispatch) {
          const result = await dispatch(this.model, messages, {
            temperature: this.generateContentConfig.temperature,
          });
          return result?.data?.choices?.[0]?.message?.content
            || result?.text || result?.content || result;
        }
      } catch (fallbackErr) {
        logger.error(`[ADK] Fallback modelDispatcher also failed: ${fallbackErr.message}`);
      }
    }
    throw new BusinessError(ERROR_CODE.INTERNAL_ERROR, `Model "${this.model}" not available`);
  }
}
