/**
 * ADK 核心原语 — Tool（工具）
 * 可调用函数/类，提供 Agent 的外部能力
 */

/** 函数工具 — 包装纯函数 + 自动 schema 生成 */
export class FunctionTool {
  /**
   * @param {string} name 工具名称
   * @param {Function} fn  实际函数 (params, invocationContext?) => result
   * @param {{ description?: string, parameters?: object }} opts
   */
  constructor(name, fn, opts = {}) {
    this.name = name;
    this.fn = fn;
    this.description = opts.description || '';
    this.parameters = opts.parameters || {};
  }

  /** 生成 JSON Schema 供 LLM function calling 使用 */
  toSchema() {
    return {
      type: 'function',
      function: {
        name: this.name,
        description: this.description,
        parameters: {
          type: 'object',
          properties: this.parameters,
          required: Object.keys(this.parameters),
        },
      },
    };
  }
}

/** Agent 工具 — 把子 Agent 包装成可调用工具 (ADK AgentTool) */
export class AgentTool {
  /**
   * @param {import('./agent.js').BaseAgent} agent 子 Agent 实例
   * @param {{ description?: string }} opts
   */
  constructor(agent, opts = {}) {
    this.name = agent.name;
    this.agent = agent;
    this.description = opts.description || `Delegate to ${agent.name}`;
  }

  toSchema() {
    return {
      type: 'function',
      function: {
        name: `delegate_to_${this.name}`,
        description: this.description,
        parameters: { type: 'object', properties: { query: { type: 'string', description: 'The task/query to delegate' } }, required: ['query'] },
      },
    };
  }
}
