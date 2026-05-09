/**
 * ADK 核心原语 — Event（事件）
 * 原子通信单元，承载内容 + 副作用 actions
 */
export class Event {
  /** @param {{ type: string, content?: any, actions?: any[], invocationId?: string, agentName?: string, branch?: string }} */
  constructor(opts) {
    this.type = opts.type           // 'agent.start' | 'agent.end' | 'tool.call' | 'tool.result' | 'state.delta'
    this.content = opts.content ?? null
    this.actions = opts.actions ?? []
    this.invocationId = opts.invocationId ?? null
    this.agentName = opts.agentName ?? null
    this.branch = opts.branch ?? null
    this.timestamp = Date.now()
  }

  hasAction(actionType) {
    return this.actions.some(a => a.type === actionType)
  }
}
